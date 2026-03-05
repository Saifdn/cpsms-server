import jwt from "jsonwebtoken"

export const verifyAccessToken = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.sendStatus(401)

  const token = authHeader.split(" ")[1]

  jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
    if (err) return res.sendStatus(403)
    req.user = decoded
    next()
  })
}

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.sendStatus(403)
    next()
  }
}