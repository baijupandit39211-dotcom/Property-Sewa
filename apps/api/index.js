//apps/api/index.js
const dotenv = require("dotenv");
dotenv.config(); // MUST be first

const connectDB = require("./src/db/connectDB");
const app = require("./src/app");

connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
	console.log(`Server running on PORT ${PORT}`);
});
