const jwt = require('jsonwebtoken');
require("dotenv").config();

const protect = (req,res,next)=>{
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];

    if(!token){
        return res.status(401).json({message:"Token topilmadi."});
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token noto‘g‘ri yoki muddati o‘tgan' });
    }
}

module.exports = protect;