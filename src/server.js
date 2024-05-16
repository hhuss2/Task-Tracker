require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const path = require('path');
const User = require('./models/user');
const Task = require('./models/task');
const authController = require('./controllers/authController');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();

const dbUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/your-db';

app.use(session({
  secret: process.env.SESSION_SECRET || 'this is a secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: dbUrl }),
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production' }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const user = await User.findOne({ username });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return done(null, false, { message: 'Incorrect username or password' });
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

app.use(flash());
app.set('view engine', 'ejs');

mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});

app.post('/login', 
  passport.authenticate('local', {
    successRedirect: '/home',
    failureRedirect: '/login',
    failureFlash: true
  })
);

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/logout', authController.logout);

app.get('/home', authMiddleware, authController.renderHome);

app.post('/register', authController.register);

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/add-task', authMiddleware, authController.addTask);

app.post('/update-task-status', authMiddleware, authController.updateTaskStatus);

app.delete('/tasks/:taskId', authMiddleware, authController.deleteTask);

app.get('/', (req, res) => {
  res.redirect('/login');
});

app.post('/save-task-state', authMiddleware, async (req, res) => {
  try {
    const { taskId, state } = req.body;
    await Task.findByIdAndUpdate(taskId, { state });
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error saving task state" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running. Access the application at: http://localhost:${PORT}`);
});
