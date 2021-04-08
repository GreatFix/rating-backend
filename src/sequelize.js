const Sequelize = require("sequelize");
const UserModel = require("./models/User");
const TargetModel = require("./models/Target");
const FeedbackModel = require("./models/Feedback");
const CommentModel = require("./models/Comment");
const CommentListModel = require("./models/CommentList");

const sequelize = new Sequelize(process.env.DATABASE_URL);

const User = UserModel(sequelize, Sequelize);
const Target = TargetModel(sequelize, Sequelize);
const Feedback = FeedbackModel(sequelize, Sequelize);
const Comment = CommentModel(sequelize, Sequelize);
const CommentList = CommentListModel(sequelize, Sequelize);

User.hasMany(Feedback, { onDelete: "cascade" });
Feedback.belongsTo(User);

Target.hasMany(Feedback, { onDelete: "cascade" });
Feedback.belongsTo(Target);

User.hasMany(Comment, { onDelete: "cascade" });
Comment.belongsTo(User);

CommentList.hasOne(Feedback, { onDelete: "cascade" });
Feedback.belongsTo(CommentList);

CommentList.hasMany(Comment, { onDelete: "cascade" });
Comment.belongsTo(CommentList);

sequelize
  .authenticate()
  .then(() => console.log("Successful connection."))
  .catch((err) => console.error("Connection error:", err));

sequelize
  .sync()
  .then(() => console.log("Synchronized"))
  .catch((err) => console.error("Synchronization error:" + err));

module.exports = { User, Target, Feedback, Comment, CommentList };
