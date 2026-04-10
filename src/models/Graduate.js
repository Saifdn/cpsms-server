import BaseUser from './User.js';
import mongoose from 'mongoose';

const graduateSchema = new mongoose.Schema({

  address: {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    line3: { type: String, trim: true }
  },
  postcode: {
    type: String,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
  },
});

const Graduate = BaseUser.discriminator('graduate', graduateSchema);

export default Graduate;