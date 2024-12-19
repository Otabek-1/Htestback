const getUsers = `SELECT fullname FROM htestusers`;

const addUser = `INSERT INTO htestusers (fullname, email, password) VALUES ($1,$2,$3)`;
const checkUserbyEmail = `SELECT * FROM htestusers WHERE email = $1`;
const getUserById = `SELECT * FROM htestusers WHERE id = $1`; // Foydalanuvchini ID orqali olish
const addPost  = `INSERT INTO htestposts (title, content, author, slug) VALUES ($1, $2, $3, $4)`;
const getPosts = `SELECT * FROM htestposts`;
const getArticleBySlug = `SELECT * FROM htestposts WHERE slug = $1`;
const getArticle = `SELECT * FROM htestposts WHERE slug = $1`;
const like = 'UPDATE htestposts SET likes = $1 WHERE slug = $2';

module.exports = {
    getUsers,
    addUser,
    checkUserbyEmail,
    getUserById,
    addPost,
    getPosts,
    getArticleBySlug,
    getArticle,
    like,
}