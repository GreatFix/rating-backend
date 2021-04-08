const jwt = require("jsonwebtoken");
const { User } = require("../sequelize");
async function isAuth(req, res, next) {
  try {
    const { userVKID } = req.body;
    const user = await User.findOne({ where: { vkid: userVKID } });
    if (user) {
      const verify = jwt.verify(
        getTokenFromHeader(req),
        process.env.SECRET_KEY
      );
      verify._id === user.id
        ? next()
        : res.status(401).end("Authorization failed");
    } else res.status(401).end("User not found");
  } catch (err) {
    res.status(400).send(err.toString());
  }
}

const getTokenFromHeader = (req) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.split(" ")[0] === "Bearer"
  ) {
    return req.headers.authorization.split(" ")[1];
  }
};
module.exports = {
  isAuth,
};
