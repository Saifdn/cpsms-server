import BaseUser from './User.js';
import mongoose from 'mongoose';

const graduateSchema = new mongoose.Schema({

  addresss: {
    type: String,
    trim: true,
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