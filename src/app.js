const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const courseAllocationRoutes = require('./routes/courseAllocationRoutes');
const facilitatorActivityRoutes = require('./routes/facilitatorActivityRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const cohortRoutes = require('./routes/cohortRoutes');
const classRoutes = require('./routes/classRoutes');
const moduleRoutes = require('./routes/moduleRoutes');
const modeRoutes = require('./routes/modeRoutes');

// Import middleware
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Import database and services
const { sequelize } = require('./models');


const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.static('public'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Course Management Platform API',
      version: '1.0.0',
      description: 'A comprehensive course management system for academic institutions',
      contact: {
        name: 'API Support',
        email: 'support@coursemanagement.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: [
    './src/routes/*.js',
    './src/models/*.js',
    './src/routes/cohortRoutes.js',
    './src/routes/classRoutes.js',
    './src/routes/moduleRoutes.js',
    './src/routes/modeRoutes.js'
  ]
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Course Management Platform API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/course-allocations', courseAllocationRoutes);
app.use('/api/facilitator-activities', facilitatorActivityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cohorts', cohortRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/modes', modeRoutes);
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Initialize services
const initializeServices = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    console.log('Database models synchronized.');
  } catch (error) {
    console.error('Service initialization failed:', error);
    throw error;
  }
};

// Start server
const startServer = async () => {
  try {
    await initializeServices();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};



// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;