const express = require("express");
const { register, login, getUser,updateUser,upload, addPost, getPosts, showArticle, getUsers, like, createTest, getTests, registerToTest, unregisterFromTest } = require("./controllers");
const protect = require("../middlewares/authMiddleware");


const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get("/user/me", getUser);
router.post("/update-user", upload.single("avatar"), updateUser);
router.post('/add-post', addPost);
router.get('/get-posts', getPosts);
router.get('/show/:slug', showArticle);
router.get('/users', getUsers);
router.put('/like/:article', like);
router.post('/create-test', createTest);
router.get('/get-tests', getTests);
router.put('/register-to-test/:testId', registerToTest);
router.put("/unregister-from-test/:testId", unregisterFromTest);


router.get('/protected', protect, (req,res)=>{
    res.json({message:"Secured", user:req.user})
})

module.exports = router;