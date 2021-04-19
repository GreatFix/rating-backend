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
      albumId: {
        type: DataTypes.INTEGER,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      images: {
        type: DataTypes.JSONB,
      },
      conclusion: {
        type: DataTypes.ENUM,
        values: ["positive", "negative"],
        allowNull: false,
      },
    },
    {
      indexes: [
        {
          name: "no-more-one-feedback",
          unique: true,
          fields: ["UserId", "TargetId"],
        },
      ],
    }
  );
};
