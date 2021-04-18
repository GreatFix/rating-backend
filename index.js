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
    const { stringParams, sign, userID } = req.body;
    const paramsHash = crypto
      .createHmac("sha256", process.env.SECRET_KEY)
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
        const token = jwt.sign({ id: userID }, process.env.SECRET_KEY);
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
        include: { model: CommentList, include: Comment },
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
      const { content, images, conclusion, targetID } = req.body;
      const [target, created] = await Target.findOrCreate({
        where: { id: targetID },
      });
      const user = await User.findByPk(userID);
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
