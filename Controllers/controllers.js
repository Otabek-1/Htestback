const query = require('./queries');
const pg = require("./pg");
const { hashPassword, comparePassword } = require("./crypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const slugify = require("slugify");
const { connectToMongo } = require("./mongo");
const { ObjectId } = require("mongodb");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/avatars"); // Fayllarni "uploads/avatars" papkasiga saqlash
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName); // Fayl nomini vaqtga qarab unikallashtirish
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true); // Fayl turi to'g'ri
    } else {
        cb(new Error("Faqat rasm fayllari yuklashga ruxsat etilgan!"), false); // Noto‘g‘ri format
    }
};

const upload = multer({ storage, fileFilter });

async function register(req, res) {
    const { name, email, password } = req.body;

    try {
        const check = await pg.query(query.checkUserbyEmail, [email]);

        if (check.rows.length > 0) {
            return res.status(400).json({ message: "Foydalanuvchi mavjud!" });
        } else {
            const hashedPassword = await hashPassword(password);
            const result = await pg.query(query.addUser, [name, email, hashedPassword]);
            res.status(201).json({ message: "Ro'yxatdan o'tdingiz!" });
        }
    } catch (error) {
        res.status(500).json({ message: error });
    }
}

async function login(req, res) {
    const { email, password } = req.body;

    try {
        const check = await pg.query(query.checkUserbyEmail, [email]);

        // Agar foydalanuvchi topilmasa, javob yuboring va funksiyani to'xtating
        if (check.rows.length === 0) {
            return res.status(404).send({ message: "Foydalanuvchi topilmadi!" });
        }

        const user = check.rows[0];

        // Parolni tekshirish
        const isMatch = await comparePassword(password, user.password);

        // Agar parol xato bo'lsa, javob yuboring va funksiyani to'xtating
        if (!isMatch) {
            return res.status(401).send({ message: "Parol xato!" });
        } else {
            // Agar parol to'g'ri bo'lsa, token yarating va javob yuboring
            const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
            return res.status(200).json({ message: "Muvaffaqiyatli tizimga kirdingiz!", token, role: user.role });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Xatolik yuz berdi!' });
    }
}

async function getUser(req, res) {
    const { authorization } = req.headers;

    try {
        if (!authorization) {
            return res.status(401).send({ message: "Token yo'q!" });
        }

        const token = authorization.split(" ")[1]; // Tokenni olish

        if (!token) {
            return res.status(401).send({ message: "Token topilmadi!" });
        }

        // Tokenni tekshirish
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // Foydalanuvchi ma'lumotlarini olish
        const result = await pg.query(query.getUserById, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).send({ message: "Foydalanuvchi topilmadi!" });
        }

        const user = result.rows[0];

        // Foydalanuvchi haqida barcha ma'lumotlarni qaytarish
        res.status(200).json({
            id: user.id,
            name: user.fullname,
            email: user.email,
        });

    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Xatolik yuz berdi!" });
    }
}

const updateUser = async (req, res) => {
    const { authorization } = req.headers;

    try {
        // Tokenni tekshirish
        if (!authorization) {
            return res.status(401).send({ message: "Token yo'q!" });
        }

        const token = authorization.split(" ")[1];
        if (!token) {
            return res.status(401).send({ message: "Token topilmadi!" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // Ma'lumotlarni olish
        const { firstName, lastName, bio } = req.body;
        let avatarPath;

        // Avatarni tekshirish va yuklash
        if (req.file) {
            avatarPath = req.file.path.replace(/\\/g, "/"); // Fayl yo'li
        }

        // Ma'lumotlarni yangilash
        const updateQuery = `
        UPDATE htestusers
        SET 
          fullname = COALESCE($1, fullname),
          bio = COALESCE($2, bio),
          avatar = COALESCE($3, avatar)
        WHERE id = $4
        RETURNING id, fullname, bio, avatar;
      `;
        const result = await pg.query(updateQuery, [firstName + " " + lastName, bio, avatarPath, userId]);

        if (result.rows.length === 0) {
            return res.status(404).send({ message: "Foydalanuvchi topilmadi!" });
        }

        res.status(200).send({ message: "Ma'lumotlar muvaffaqiyatli yangilandi!", user: result.rows[0] });
    } catch (error) {
        console.error("Xatolik:", error);
        res.status(500).send({ message: "Xatolik yuz berdi!" });
    }
};

async function addPost(req, res) {
    const { authorization } = req.headers;
    try {
        if (!authorization) {
            return res.status(401).send({ message: "Token yo'q!" });
        }
        const token = authorization.split(" ")[1];
        if (!token) {
            return res.status(401).send({ message: "Token topilmadi!" });
        }
        const { title, content, author } = req.body;
        const slug = slugify(title, {
            lower: true,                  // Harflarni kichik qilib o'zgartirish
            remove: /[^\w\s-]/g,          // Maxsus belgilarni olib tashlash
            replacement: '-',             // Bo‘shliqlarni '-' bilan almashtirish
        });
        try {
            const result = pg.query(query.addPost, [title, content, author, slug])
            res.status(200).json({ message: `${title} sarlavhali kontent backendga muvaffaqqiyatli keldi.` })
        } catch (error) {
            res.status(500).json({ message: "Nomalum xatolik" });
        }
    } catch (error) {
        res.status(500).json({ message: "Nomalum xatolik" });
        console.log(error);
    }
}

async function getPosts(req, res) {
    try {
        const result = await pg.query(query.getPosts);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: "Nomalum xatolik" });
    }
}

async function showArticle(req, res) {
    const { slug } = req.params;
    try {
        const result = await pg.query(query.getArticleBySlug, [slug]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Ma'lumot topilmadi!" });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: "Nomalum xatolik" });
    }
}

async function getUsers(req, res) {
    try {
        const result = await pg.query(query.getUsers);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).send(error);
        console.log(error);
    }
}

async function like(req, res) {
    const { article } = req.params;
    const { id } = req.body;
    try {
        const articleData = await pg.query(query.getArticle, [article])
        if (articleData.rows.length === 0) {
            return res.status(404).json({ message: "Ma'lumot topilmadi!" });
        }
        let likes = articleData.rows[0].likes;
        if (!likes.includes(id)) {
            likes.push(id);
            try {
                const result = await pg.query(query.like, [likes, article])
                return res.status(200).json({ message: "Success!" });
            } catch (error) {
                res.status(500).json({ message: "Noma'lum xatolik" });
                console.log(error);
            }
        }

    } catch (error) {
        res.status(500).json({ message: "Nomalum xatolik" });
    }
}

async function createTest(req, res) {
    const data = req.body; // Yuborilgan ma'lumotni olish
    try {
        const db = await connectToMongo(); // MongoDB ulanishini oling
        const collection = db.collection("tests"); // Kolektsiyani oling
        const result = await collection.insertOne(data); // Ma'lumotni saqlash
        res.status(200).json(result); // Javobni qaytarish
    } catch (error) {
        console.error("createTest xatosi:", error);
        res.status(500).json({ message: "Ma'lumotlarni saqlashda xatolik yuz berdi." });
    }
}


async function getTests(req, res) {
    const db = await connectToMongo();
    try {
        const collection = await db.collection('tests');
        const result = await collection.find().toArray();
        res.status(200).json(result);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Xatolik" });
    }
}

async function registerToTest(req, res) {
    const { authorization } = req.headers; // Token olish
    const { id } = req.body; // Foydalanuvchi ID-si
    const { testId } = req.params; // Test ID-si

    try {
        if (!authorization) {
            return res.status(401).json({ message: "Token yo'q!" });
        }

        const token = authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Tokenni tekshirish

        const db = await connectToMongo(); // MongoDB ulanishini oling
        const collection = db.collection("tests"); // "tests" kolleksiyasini oling

        // Foydalanuvchini `participantsList` arrayiga qo'shish
        const result = await collection.updateOne(
            { _id: new ObjectId(testId) }, // Testni ID bo'yicha aniqlash
            { $addToSet: { participantsList: id } } // Foydalanuvchini arrayga qo'shish ($addToSet takroriy qiymat qo'shmaydi)
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Test topilmadi!" });
        }

        res.status(200).json({ message: "Foydalanuvchi muvaffaqiyatli ro'yxatga olindi!" });
    } catch (error) {
        console.error("Ro'yxatga olishda xatolik:", error);
        res.status(500).json({ message: "Xatolik yuz berdi." });
    }
}

async function unregisterFromTest(req, res) {
    const { authorization } = req.headers; // Token olish
    const { id } = req.body; // Foydalanuvchi ID-si
    const { testId } = req.params; // Test ID-si

    try {
        if (!authorization) {
            return res.status(401).json({ message: "Token mavjud emas!" });
        }

        const token = authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Tokenni tekshirish

        const db = await connectToMongo(); // MongoDB ulanishi
        const collection = db.collection("tests"); // "tests" kolleksiyasini olish

        // Foydalanuvchini `participantsList` massivdan olib tashlash
        const result = await collection.updateOne(
            { _id: new ObjectId(testId) }, // Testni ID bo'yicha topish
            { $pull: { participantsList: id } } // Foydalanuvchini massivdan olib tashlash
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Test topilmadi!" });
        }

        res.status(200).json({ message: "Foydalanuvchi muvaffaqiyatli ro'yxatdan chiqarildi!" });
    } catch (error) {
        console.error("Ro'yxatdan chiqarishda xatolik:", error);
        res.status(500).json({ message: "Xatolik yuz berdi." });
    }
}



module.exports = {
    register,
    login,
    getUser,
    updateUser,
    upload,
    addPost,
    getPosts,
    showArticle,
    getUsers,
    like,
    createTest,
    getTests,
    registerToTest,
    unregisterFromTest,
}