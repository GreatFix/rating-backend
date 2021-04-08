module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Feedback",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      datetime: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      images: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      conclusion: {
        type: DataTypes.ENUM,
        values: ["positive", "negative"],
        allowNull: false,
      },
    },
    {
      timestamps: false,
    }
  );
};
