import BaseUser from './User.js';
import mongoose from 'mongoose';


const staffSchema = new mongoose.Schema({
  department: {
    type: String,
    required: true,
  },
});

const Staff = BaseUser.discriminator('staff', staffSchema);

export default Staff;