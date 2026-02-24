import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';        
import Graduate from '../models/Graduate.js';
// import Staff from '../models/Staff.js';   // later

// Helper to generate tokens
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
  );
};

// SIGN UP (example: graduate registration – adapt for staff/admin)
export const registerGraduate = async (req, res) => {
  try {
    const {
      email, password, fullName, phone
    } = req.body;

    // Basic validation (add express-validator later if needed)
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ message: 'Invalid input' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const graduate = new Graduate({
      email,
      password: hashedPassword,
      fullName,
      phone,
      role: 'graduate' // auto-set by discriminator, but explicit is fine
    });

    await graduate.save();

    // Optional: auto-login after register
    const accessToken = generateAccessToken(graduate);
    const refreshToken = generateRefreshToken(graduate);

    // Store refresh token (simple version: overwrite previous)
    graduate.refreshTokens = [{ token: refreshToken }];
    await graduate.save();

    // Set HttpOnly cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true in prod (HTTPS)
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
    });

    res.status(201).json({
      accessToken,
      user: {
        id: graduate._id,
        email: graduate.email,
        fullName: graduate.fullName,
        role: graduate.role,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// SIGN IN (login – works for any role)
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Update refresh token (rotation: replace old one)
    user.refreshTokens = [{ token: refreshToken }];
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// REFRESH TOKEN endpoint (get new access token)
export const refreshToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.sendStatus(401);

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.refreshTokens.some(rt => rt.token === refreshToken)) {
      return res.sendStatus(403); // forbidden – token invalid/revoked
    }

    const newAccessToken = generateAccessToken(user);

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.sendStatus(403);
  }
};

// LOGOUT (clear cookie + remove refresh token)
export const logout = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    // Optional: remove from DB
    await User.updateOne(
      { refreshTokens: { $elemMatch: { token: refreshToken } } },
      { $pull: { refreshTokens: { token: refreshToken } } }
    );
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  res.json({ message: 'Logged out' });
};