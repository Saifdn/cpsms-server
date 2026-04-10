import BaseUser from './User.js';
import mongoose from 'mongoose';


const adminSchema = new mongoose.Schema({
  adminLevel: {
    type: String,
    enum: ['super', 'admin'],
    default: 'admin',
  },
});

const Admin = BaseUser.discriminator('admin', adminSchema);

export default Admin;