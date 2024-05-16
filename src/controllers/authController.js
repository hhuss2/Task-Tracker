const bcrypt = require('bcrypt');
const User = require('../models/user');
const Task = require('../models/task');


// Handle user login
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.render('login', { errorMessage: 'User not found' }); 
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.render('login', { errorMessage: 'Invalid password' }); 
    }
    res.redirect('/home'); 
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error logging in" });
  }
};


const addTask = async (req, res) => {
  try {
    const { task } = req.body;
    const userId = req.user._id;
    const newTask = new Task({
      description: task,
      createdBy: userId,
      createdAt: new Date() // Add timestamp when task is created
    });
    await newTask.save();
    res.redirect('/home');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error adding task" });
  }
};

const updateTaskStatus = async (req, res) => {
  try {
    const { taskId, newStatus } = req.body;
    const userId = req.user._id;
    const task = await Task.findOne({ _id: taskId, createdBy: userId });
    if (!task) {
      return res.status(404).json({ message: "Task not found or unauthorized" });
    }
    if (!['To Do', 'In Progress', 'Done'].includes(newStatus)) {
      return res.status(400).json({ message: "Invalid task status" });
    }
    if (newStatus === 'Done' && task.status === 'In Progress') {
      const now = new Date();
      const durationInMs = now - task.createdAt;
      const durationInHours = durationInMs / (1000 * 60 * 60);
    }
    task.status = newStatus;
    await task.save();
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating task status" });
  }
};


const deleteTask = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const deletedTask = await Task.deleteOne({ _id: taskId, createdBy: req.user._id });
    if (deletedTask.deletedCount === 0) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: "Error deleting task" });
  }
};

const renderHome = async (req, res) => {
  try {
    const userId = req.user._id;
    const tasks = await Task.find({ createdBy: userId });

    // Calculate duration for each task
    tasks.forEach(task => {
      const currentTime = new Date();
      const durationInMs = currentTime - task.createdAt;
      const durationInMinutes = Math.floor(durationInMs / (1000 * 60));
      task.durationInMinutes = durationInMinutes;
    });

    // Separate tasks based on their status
    const todoTasks = tasks.filter(task => task.status === 'To Do');
    const inProgressTasks = tasks.filter(task => task.status === 'In Progress');
    const doneTasks = tasks.filter(task => task.status === 'Done');

    res.render('home', { todoTasks, inProgressTasks, doneTasks });
  } catch (error) {
    console.error('Error rendering home page:', error);
    res.status(500).json({ message: "Error rendering home page" });
  }
};


const register = async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      req.flash('error', 'Username already exists');
      return res.redirect('/register');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    req.flash('success', 'User registered successfully');
    res.redirect('/login');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error registering user" });
  }
};

const logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: "Error logging out" });
    } else {
      req.flash('success', 'Logged out successfully');
      res.redirect('/login');
    }
  });
};


module.exports = {
  login,
  renderHome,
  register,
  addTask,
  logout,
  deleteTask,
  updateTaskStatus,
};
