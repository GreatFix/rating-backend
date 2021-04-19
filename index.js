const express = require("express");
const crypto = require("crypto");
const easyvk = require("easyvk");
const path = require("path");
const jwt = require("jsonwebtoken");
const app = express();
const { User, Target, Feedback, Comment } = require("./src/sequelize");
const cors = require("cors");
const { isAuth } = require("./src/utils/isAuth");
const { uploadImages } = require("./src/utils/uploadImages");

app.use(cors());
app.use(express.json({ limit: "50mb" }));

const GROUP_ID_VK = process.env.GROUP_ID_VK;
const ALBUM_ID_VK = process.env.ALBUM_ID_VK;
const USERNAME_VK = process.env.USERNAME_VK;
const PASSWORD_VK = process.env.PASSWORD_VK;
const VERSION_API_VK = process.env.VERSION_API_VK;

let vk;
easyvk({
  username: USERNAME_VK,
  password: PASSWORD_VK,
  v: VERSION_API_VK,
  utils: { uploader: true },
  sessionFile: path.join(__dirname, ".my-session"),
})
  .then((res) => (vk = res))
  .catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.status(200).send("Launched");
});

app.post("/auth", async (req, res) => {
  try {
    const { stringParams, sign, userID } = req.body;
    const paramsHash = crypto
      .createHmac("sha256", "WeABMIrRFPOlg38Kvthr")
      .update(stringParams)
      .digest()
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=$/, "");

    if (paramsHash === sign) {
      const [user, created] = await User.findOrCreate({
        where: { id: userID },
      });

      if (user) {
        const token = jwt.sign({ id: userID }, "WeABMIrRFPOlg38Kvthr");
        res.status(200).json({ token });
      } else res.status(401).send("Error in user definition");
    } else res.status(401).send("Invalid sign");
  } catch (err) {
    res.status(400).send(err.toString());
  }
});

app.get("/user", isAuth, async (req, res) => {
  try {
    const { userID } = req.query;
    const user = await User.findByPk(userID, {
      include: Feedback,
    });
    user ? res.status(200).json({ user }) : res.status(404).send({});
  } catch (err) {
    res.status(400).send(err.toString());
  }
});

app.get("/target", async (req, res) => {
  try {
    const { targetID } = req.query;
    const target = await Target.findByPk(targetID, {
      include: {
        model: Feedback,
        include: Comment,
      },
    });
    target ? res.status(200).json({ target }) : res.status(404).send({});
  } catch (err) {
    res.status(400).send(err.toString());
  }
});

app.get("/targets", async (req, res) => {
  try {
    const { arrayTargetIds } = req.query;
    const targets = await Target.findAll({
      where: {
        id: arrayTargetIds,
      },
    });
    targets ? res.status(200).json({ targets }) : res.status(404).send([]);
  } catch (err) {
    res.status(400).send(err.toString());
  }
});

app
  .route("/feedback")
  .post(isAuth, async (req, res) => {
    try {
      const { userID } = req.query;
      let { content, images, conclusion, targetID } = req.body;
      const [target, created] = await Target.findOrCreate({
        where: { id: targetID },
      });
      const user = await User.findByPk(userID);
      const feedback = await user.createFeedback({
        content,
        conclusion,
        TargetId: target.id,
      });

      if (feedback) {
        if (conclusion === "positive") {
          target.increment("countPositiveFeedbacks");
          user.increment("countPositiveFeedbacks");
        } else {
          target.increment("countNegativeFeedbacks");
          user.increment("countNegativeFeedbacks");
        }
        const album = await vk.post("photos.createAlbum", {
          title: `${target.id}_${feedback.id}`,
          group_id: GROUP_ID_VK,
        });

        const uploadedImages = await uploadImages(vk, images, album);

        feedback.images = uploadedImages;
        feedback.save();

        res.status(200).json({ feedback });
      } else res.status(400).send("Ошибка при добавлении отзыва");
    } catch (err) {
      res.status(400).send(err.toString());
    }
  })
  .put(isAuth, async (req, res) => {
    try {
      const { content, images, conclusion, feedbackId } = req.body;
      const feedback = await Feedback.findByPk(feedbackId);
      const user = await User.findByPk(feedback.UserId);
      const target = await Target.findByPk(feedback.TargetId);
      if (feedback) {
        if (feedback.conclusion !== conclusion && conclusion === "positive") {
          target.increment("countPositiveFeedbacks");
          user.increment("countPositiveFeedbacks");
          target.decrement("countNegativeFeedbacks");
          user.decrement("countNegativeFeedbacks");
        } else if (
          feedback.conclusion !== conclusion &&
          conclusion === "negative"
        ) {
          target.decrement("countPositiveFeedbacks");
          user.decrement("countPositiveFeedbacks");
          target.increment("countNegativeFeedbacks");
          user.increment("countNegativeFeedbacks");
        }
        feedback.content = content;
        feedback.images = images;
        feedback.conclusion = conclusion;

        feedback.save();
        res.status(200).json({ feedback });
      } else res.status(404).end("Feedback not found");
    } catch (err) {
      res.status(400).send(err.toString());
    }
  })
  .delete(isAuth, async (req, res) => {
    try {
      const { feedbackId } = req.body;
      const feedback = await Feedback.findByPk(feedbackId);
      const user = await User.findByPk(feedback.UserId);
      const target = await Target.findByPk(feedback.TargetId);

      if (feedback) {
        feedback?.images?.[0] &&
          (await vk.post("photos.deleteAlbum", {
            group_id: GROUP_ID_VK,
            album_id: feedback.images[0]?.album_id,
          }));
        if (feedback.conclusion === "positive") {
          target.decrement("countPositiveFeedbacks");
          user.decrement("countPositiveFeedbacks");
        } else {
          target.decrement("countNegativeFeedbacks");
          user.decrement("countNegativeFeedbacks");
        }
        feedback.destroy();

        res.status(200).send("Successful deleted");
      } else res.status(404).end("Feedback not found");
    } catch (err) {
      res.status(400).send(err.toString());
    }
  });

app
  .route("/comment")
  .post(isAuth, async (req, res) => {
    try {
      const { userID } = req.query;
      const { content, images, feedbackId } = req.body;
      const user = await User.findByPk(userID);
      const feedback = await Feedback.findByPk(feedbackId);
      if (feedback) {
        const comment = await feedback.createComment({
          content,
          images,
          UserId: user.id,
        });
        user.increment("countComments");
        if (comment) {
          res.status(200).json({ comment });
        } else res.status(500).send("Ошибка при добавлении ответа на отзыв");
      } else res.status(404).end("Feedback not found");
    } catch (err) {
      res.status(400).send(err.toString());
    }
  })
  .put(isAuth, async (req, res) => {
    try {
      const { content, images, commentId } = req.body;
      const comment = await Comment.findByPk(commentId);
      if (comment) {
        comment.content = content;
        comment.images = images;
        comment.save();

        res.status(200).json({ comment });
      } else res.status(404).end("Comment not found");
    } catch (err) {
      res.status(400).send(err.toString());
    }
  })
  .delete(isAuth, async (req, res) => {
    try {
      const { userID } = req.query;
      const { commentId } = req.body;
      const comment = await Comment.findByPk(commentId);
      const user = await User.findByPk(userID);

      if (comment) {
        user.decrement("countComments");
        comment.destroy();

        res.status(200).send("Successful deleted");
      } else res.status(401).end("Comment not found");
    } catch (err) {
      res.status(400).send(err.toString());
    }
  });

app.listen(process.env.PORT || 5000, function () {
  console.log("Listening on " + process.env.PORT || 5000);
});
