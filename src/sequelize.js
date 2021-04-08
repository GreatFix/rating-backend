const Sequelize = require("sequelize");
const UserModel = require("./models/User");
const TargetModel = require("./models/Target");
const FeedbackModel = require("./models/Feedback");
const ResponseModel = require("./models/Response");

const sequelize = new Sequelize("rating-bd", "postgres", "1234", {
  host: "localhost",
  dialect: "postgres",
  // dialectOptions: {
  //   ssl: {
  //     rejectUnauthorized: false,
  //   },
  // },
});

const User = UserModel(sequelize, Sequelize);
const Target = TargetModel(sequelize, Sequelize);
const Feedback = FeedbackModel(sequelize, Sequelize);
const Response = ResponseModel(sequelize, Sequelize);

User.hasMany(Feedback, { onDelete: "cascade" });
Feedback.belongsTo(User);
Target.hasMany(Feedback, { onDelete: "cascade" });
Feedback.belongsTo(Target);
Response.hasOne(Feedback);
Feedback.belongsTo(Response, { onDelete: "cascade" });

sequelize
  .authenticate()
  .then(() => console.log("Successful connection."))
  .catch((err) => console.error("Connection error:", err));

sequelize
  .sync({ after: true })
  .then(() => console.log("Synchronized"))
  .catch((err) => console.error("Synchronization error:" + err));

module.exports = { User, Target, Feedback, Response };
