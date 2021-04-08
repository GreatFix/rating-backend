const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const app = express();
const {
  User,
  Target,
  Feedback,
  Comment,
  CommentList,
} = require("./src/sequelize");
const cors = require("cors");
const { isAuth } = require("./src/utils/isAuth");

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).send("Launched");
});

app.post("/auth", async (req, res) => {
  try {
    const { stringParams, sign, userVKID } = req.body;
    const paramsHash = crypto
      .createHmac("sha256", process.env.SECRET_KEY)
      .update(stringParams)
      .digest()
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=$/, "");

    if (paramsHash === sign) {
      const user =
        (await User.findOne({ where: { vkid: userVKID } })) ??
        (await User.create({ vkid: userVKID }));
      if (user) {
        const token = jwt.sign(
          { vkid: userVKID, _id: user.id },
          process.env.SECRET_KEY
        );
        res.status(200).send(token);
      } else res.status(401).send("Error in user definition");
    } else res.status(401).send("Invalid sign");
  } catch (err) {
    res.status(400).send(err.toString());
  }
});

app.get("/user", isAuth, async (req, res) => {
  try {
    const { userVKID } = req.body;
    const user = await User.findOne({
      where: { vkid: userVKID },
      include: Feedback,
    });
    user ? res.status(200).send(user) : res.sendStatus(404);
  } catch (err) {
    res.status(400).send(err.toString());
  }
});

app.get("/target/:id", async (req, res) => {
  try {
    const target = await Target.findByPk(req.params.id, {
      include: {
        model: Feedback,
        include: { model: CommentList, include: Comment },
      },
    });
    target ? res.status(200).send(target) : res.sendStatus(404);
  } catch (err) {
    res.status(400).send(err.toString());
  }
});

app.get("/targets", async (req, res) => {
  try {
    const { arrayTargetIds } = req.body;
    const targets = await Target.findAll({
      where: {
        id: arrayTargetIds,
      },
    });
    targets ? res.status(200).send(targets) : res.status(404).send([]);
  } catch (err) {
    res.status(400).send(err.toString());
  }
});

app
  .route("/feedback")
  .post(isAuth, async (req, res) => {
    try {
      const { content, images, conclusion, targetVKID, userVKID } = req.body;
      const target =
        (await Target.findOne({ where: { vkid: targetVKID } })) ??
        (await Target.create({ vkid: targetVKID }));
      const user = await User.findOne({ where: { vkid: userVKID } });
      const feedback = await user.createFeedback({
        content,
        images,
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
        res.status(200).send(feedback);
      } else res.status(400).send("Ошибка при добавлении отзыва");
    } catch (err) {
      res.status(400).send(err.toString());
    }
  })
  .put(isAuth, async (req, res) => {
    try {
      const { content, images, conclusion, feedbackId } = req.body;
      const feedback = await Feedback.findByPk(feedbackId);
      if (feedback) {
        feedback.content = content;
        feedback.images = images;
        feedback.conclusion = conclusion;
        feedback.save();

        res.status(200).send(feedback);
      } else res.status(401).end("Feedback not found");
    } catch (err) {
      res.status(400).send(err.toString());
    }
  })
  .delete(isAuth, async (req, res) => {
    try {
      const { feedbackId } = req.body;
      const feedback = await Feedback.findByPk(feedbackId);
      if (feedback) {
        feedback.destroy();

        res.status(200).send("Successful deleted");
      } else res.status(401).end("Feedback not found");
    } catch (err) {
      res.status(400).send(err.toString());
    }
  });

app
  .route("/comment")
  .post(isAuth, async (req, res) => {
    try {
      const { content, images, feedbackId, userVKID } = req.body;
      const user = await User.findOne({ where: { vkid: userVKID } });
      const feedback = await Feedback.findByPk(feedbackId);
      if (feedback) {
        const commentList =
          (await CommentList.findByPk(feedback.CommentListId)) ??
          (await feedback.createCommentList());

        if (commentList) {
          const comment = await commentList.createComment({
            content,
            images,
            UserId: user.id,
          });
          if (comment) {
            res.status(200).send(comment);
          } else res.status(500).send("Ошибка при добавлении ответа на отзыв");
        }
      } else res.status(401).end("Feedback not found");
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

        res.status(200).send(comment);
      } else res.status(401).end("Comment not found");
    } catch (err) {
      res.status(400).send(err.toString());
    }
  })
  .delete(isAuth, async (req, res) => {
    try {
      const { commentId } = req.body;
      const comment = await Comment.findByPk(commentId);
      if (comment) {
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
