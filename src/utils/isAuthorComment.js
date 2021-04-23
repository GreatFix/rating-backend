const { Comment } = require("../sequelize");

async function isAuthorComment(req, res, next) {
  try {
    const { commentId, user } = req.body;
    const comment = await Comment.findByPk(commentId);

    if (comment) {
      if (user.id === comment.UserId) {
        req.body.comment = comment;
        next();
      } else {
        res.status(403).end("Access denied");
      }
    } else res.status(401).end("Comment not found");
  } catch (err) {
    res.status(400).send(err.toString());
  }
}

module.exports = {
  isAuthorComment,
};
