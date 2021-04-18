module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Comment", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    greetingID: {
      type: DataTypes.INTEGER,
    },
    greetingName: {
      type: DataTypes.STRING,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    images: {
      type: DataTypes.JSONB,
    },
  });
};
