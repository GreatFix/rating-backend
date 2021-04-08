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
        unique: true,
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
      indexes: [
        {
          unique: true,
          fields: ["vkid"],
        },
      ],
    }
  );
};
