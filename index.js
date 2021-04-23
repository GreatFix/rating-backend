const express = require("express");
const crypto = require("crypto");
const easyvk = require("easyvk");
const path = require("path");
const jwt = require("jsonwebtoken");
const app = express();
const { User, Target, Feedback, Comment } = require("./src/sequelize");
const cors = require("cors");
const { isAuth } = require("./src/utils/isAuth");
const { isAuthorFeedback } = require("./src/utils/isAuthorFeedback");
const { isAuthorComment } = require("./src/utils/isAuthorComment");
const { uploadImages } = require("./src/utils/uploadImages");
const { checkImages } = require("./src/utils/checkImages");
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
        res.status(200).json(token);
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
      include: {
        model: Feedback,
        include: Comment,
      },
      order: [
        [Feedback, "createdAt", "asc"],
        [Feedback, Comment, "createdAt", "asc"],
      ],
    });
    user ? res.status(200).json(user) : res.status(404).send({});
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
      order: [
        [Feedback, "createdAt", "asc"],
        [Feedback, Comment, "createdAt", "asc"],
      ],
    });
    target ? res.status(200).json(target) : res.status(404).send({});
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
    targets ? res.status(200).json(targets) : res.status(404).send([]);
  } catch (err) {
    res.status(400).send(err.toString());
  }
});

app.get("/recent/feedbacks", async (req, res) => {
  try {
    const { limit, offset } = req.body;
    const feedbacks = await Feedback.findAll({
      limit,
      offset,
      order: [["createdAt", "asc"]],
    });
    feedbacks ? res.status(200).json(feedbacks) : res.status(404).send([]);
  } catch (err) {
    res.status(400).send(err.toString());
  }
});

app.get("/recent/comments", async (req, res) => {
  try {
    const { limit, offset, feedbackId = undefined } = req.body;
    const comments = await Comment.findAll({
      where: {
        feedbackId,
      },
      limit,
      offset,
      order: [["createdAt", "asc"]],
    });
    comments ? res.status(200).json(comments) : res.status(404).send([]);
  } catch (err) {
    res.status(400).send(err.toString());
  }
});

app.get("/targets/top/:count", async (req, res) => {
  try {
    const { count = 50 } = req.params;
    const targets = await Target.findAll({
      limit: count,
      order: [["countPositiveFeedbacks - countNegativeFeedbacks", "desc"]],
    });
    targets ? res.status(200).json(targets) : res.status(404).send([]);
  } catch (err) {
    res.status(400).send(err.toString());
  }
});

app.get("/users/top/:count", async (req, res) => {
  try {
    const { count = 50 } = req.params;
    const users = await User.findAll({
      limit: count,
      order: [["countPositiveFeedbacks - countNegativeFeedbacks", "desc"]],
    });
    users ? res.status(200).json(users) : res.status(404).send([]);
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

        const uploadedImages = await uploadImages(vk, images, album?.id);

        feedback.images = uploadedImages;
        feedback.albumId = album?.id;
        feedback.save();

        res.status(200).json(feedback);
      } else res.status(400).send("Ошибка при добавлении отзыва");
    } catch (err) {
      res.status(400).send(err.toString());
    }
  })
  .put(isAuth, isAuthorFeedback, async (req, res) => {
    try {
      const { content, images, conclusion, feedback, user } = req.body;
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
        const checkedImages = checkImages(feedback.images, images);
        for (let img of checkedImages.toDelete) {
          await vk.post("photos.delete", {
            owner_id: -GROUP_ID_VK,
            photo_id: img?.id,
          });
        }
        const uploadedImages = await uploadImages(
          vk,
          checkedImages.newImagesWithoutOld,
          feedback.albumId
        );
        feedback.content = content;
        feedback.images = [...checkedImages.alreadyHave, ...uploadedImages];
        feedback.conclusion = conclusion;

        feedback.save();
        res.status(200).json(feedback);
      } else res.status(404).end("Feedback not found");
    } catch (err) {
      res.status(400).send(err.toString());
    }
  })
  .delete(isAuth, isAuthorFeedback, async (req, res) => {
    try {
      const { feedback, user } = req.body;
      const target = await Target.findByPk(feedback.TargetId);

      if (feedback) {
        feedback?.albumId &&
          (await vk.post("photos.deleteAlbum", {
            group_id: GROUP_ID_VK,
            album_id: feedback?.albumId,
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
      const {
        content,
        images,
        feedbackId,
        greetingName,
        greetingID,
      } = req.body;
      const user = await User.findByPk(userID);
      const feedback = await Feedback.findByPk(feedbackId);
      if (feedback) {
        const comment = await feedback.createComment({
          content,
          greetingName,
          greetingID,
          UserId: user.id,
        });
        const uploadedImages = await uploadImages(vk, images, feedback.albumId);

        comment.images = uploadedImages;
        comment.save();
        user.increment("countComments");
        if (comment) {
          res.status(200).json(comment);
        } else res.status(500).send("Ошибка при добавлении ответа на отзыв");
      } else res.status(404).end("Feedback not found");
    } catch (err) {
      res.status(400).send(err.toString());
    }
  })
  .put(isAuth, isAuthorComment, async (req, res) => {
    try {
      const { content, images, greetingName, greetingID, comment } = req.body;
      const feedback = await Feedback.findByPk(comment.FeedbackId);
      const feedback = await Feedback.findByPk(comment.FeedbackId);
      if (comment) {
        const checkedImages = checkImages(comment.images, images);
        for (let img of checkedImages.toDelete) {
          await vk.post("photos.delete", {
            owner_id: -GROUP_ID_VK,
            photo_id: img?.id,
          });
        }
        const uploadedImages = await uploadImages(
          vk,
          checkedImages.newImagesWithoutOld,
          feedback.albumId
        );
        comment.content = content;
        comment.images = [...checkedImages.alreadyHave, ...uploadedImages];
        comment.greetingName = greetingName;
        comment.greetingID = greetingID;
        comment.save();

        res.status(200).json(comment);
      } else res.status(404).end("Comment not found");
    } catch (err) {
      res.status(400).send(err.toString());
    }
  })
  .delete(isAuth, isAuthorComment, async (req, res) => {
    try {
      const { comment, user } = req.body;

      if (comment) {
        for (let img of comment?.images) {
          await vk.post("photos.delete", {
            owner_id: -GROUP_ID_VK,
            photo_id: img?.id,
          });
        }
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
