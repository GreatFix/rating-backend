module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Target",
    {
      vkid: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      countPositiveFeedbacks: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      countNegativeFeedbacks: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      timestamps: false,
    }
  );
};
