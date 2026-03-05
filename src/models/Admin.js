import BaseUser from './User.js';
import mongoose from 'mongoose';


const adminSchema = new mongoose.Schema({
  adminLevel: {
    type: String,
    enum: ['super', 'manager'],
    default: 'manager',
  },
});

const Admin = BaseUser.discriminator('admin', adminSchema);

export default Admin;