import app from "./src/app.js";
import dotenv from "dotenv";
import chalk from "chalk" ; 

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(chalk.bold.green(`Server running http://localhost:${PORT}`));
});



// app.js -> builds the app (routes, middleware, configs)

// server.js -> runs the app, starts server, connects env, DB, Queues, workers 