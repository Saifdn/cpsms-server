import mongoose from "mongoose";

const appConfigSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "singleton" },
    easyparcel: {
      access_token: { type: String, default: null },
      refresh_token: { type: String, default: null },
      expires_at: { type: Date, default: null },
      refresh_token_expires_at: { type: Date, default: null },
      connected: { type: Boolean, default: false },
      connected_at: { type: Date, default: null },
      connected_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
  },
  { _id: false, timestamps: true }
);

appConfigSchema.methods.isEPTokenValid = function () {
  if (!this.easyparcel.access_token || !this.easyparcel.expires_at) return false;
  return new Date(this.easyparcel.expires_at) - Date.now() > 5 * 60 * 1000;
};

appConfigSchema.methods.isEPRefreshValid = function () {
  if (!this.easyparcel.refresh_token || !this.easyparcel.refresh_token_expires_at) return false;
  return new Date(this.easyparcel.refresh_token_expires_at) > Date.now();
};

// Always return the same singleton document, creating it if it doesn't exist
appConfigSchema.statics.getSingleton = async function () {
  let config = await this.findById("singleton");
  if (!config) config = await this.create({ _id: "singleton" });
  return config;
};

const AppConfig = mongoose.model("AppConfig", appConfigSchema);

export default AppConfig;
