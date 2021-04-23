const { Feedback } = require("../sequelize");

async function isAuthorFeedback(req, res, next) {
  try {
    const { feedbackId, user } = req.body;
    const feedback = await Feedback.findByPk(feedbackId);

    if (feedback) {
      if (user.id === feedback.UserId) {
        req.body.feedback = feedback;
        next();
      } else {
        res.status(403).end("Access denied");
      }
    } else res.status(401).end("Feedback not found");
  } catch (err) {
    res.status(400).send(err.toString());
  }
}

module.exports = {
  isAuthorFeedback,
};
