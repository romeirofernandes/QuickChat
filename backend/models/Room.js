const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 6,
      maxlength: 6,
      uppercase: true,
      match: /^[A-Z0-9]{6}$/, 
    },
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

roomSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    await mongoose.model("Message").deleteMany({ room: this._id });
    next();
  }
);

roomSchema.pre("remove", async function (next) {
  await mongoose.model("Message").deleteMany({ room: this._id });
  next();
});

module.exports = mongoose.model("Room", roomSchema);
