module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Target",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      vkid: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      countPositiveFeedbacks: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      countNegativeFeedbacks: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      timestamps: false,
    }
  );
};
