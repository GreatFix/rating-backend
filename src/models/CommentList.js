module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "CommentList",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
    },
    {
      timestamps: false,
    }
  );
};
