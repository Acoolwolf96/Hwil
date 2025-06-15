# Hwil - Deployment Guide for Render

This guide explains how to deploy the Hwil application to Render.

## Prerequisites

- A Render account (https://render.com)
- A MongoDB Atlas account (or other MongoDB provider)
- Access to the application's source code

## Deployment Steps

### 1. Fork or Clone the Repository

Make sure you have the complete source code including the JWT key files in the `keys` directory.

### 2. Create a New Web Service on Render

1. Log in to your Render account
2. Click on "New +" and select "Web Service"
3. Connect your GitHub/GitLab repository or use the "Public Git repository" option
4. Enter the repository URL
5. Configure the service:
   - Name: hwil-backend (or your preferred name)
   - Environment: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

### 3. Configure Environment Variables

Set the following environment variables in the Render dashboard:

- `PORT`: 10000 (Render will automatically set the PORT variable, but the application will use this as a fallback)
- `DBUSERNAME`: Your MongoDB username
- `DBPASSWORD`: Your MongoDB password
- `DB`: Hwil (or your database name)
- `CLUSTER`: Your MongoDB cluster address (e.g., cluster0.ri2ztvi)
- `SESSION_SECRET`: A secure random string (or let Render generate one)
- `EMAIL_USER`: Your email address for sending notifications
- `EMAIL_PASS`: Your email password or app-specific password
- `FRONTEND_URL`: The URL of your frontend application (e.g., https://your-frontend-app.render.com)
- `JWT_ACCESS_PRIVATE_KEY_PATH`: keys/private.key
- `JWT_ACCESS_PUBLIC_KEY_PATH`: keys/public.key
- `JWT_REFRESH_PRIVATE_KEY_PATH`: keys/private.key
- `JWT_REFRESH_PUBLIC_KEY_PATH`: keys/public.key
- `JWT_ACCESS_EXPIRES`: 900 (15 minutes)
- `JWT_REFRESH_EXPIRES`: 604800 (7 days)

### 4. Deploy the Service

Click "Create Web Service" to deploy your application.

### 5. Verify Deployment

Once the deployment is complete, you can verify that your application is running by:

1. Checking the logs in the Render dashboard
2. Visiting the deployed URL (e.g., https://hwil-backend.onrender.com)
3. Testing the API endpoints using a tool like Postman

## Troubleshooting

### JWT Key Files

Make sure the JWT key files (`private.key` and `public.key`) are included in your repository in the `keys` directory. These files are required for JWT token signing and verification.

### Database Connection

#### MongoDB Atlas Configuration

To ensure your application can connect to MongoDB Atlas from Render, you need to configure your MongoDB Atlas Network Access settings. You have two options:

##### Option 1: Allow Access from Anywhere (Recommended for Development)

1. Log in to your MongoDB Atlas account
2. Navigate to Network Access under Security in the left sidebar
3. Click "Add IP Address"
4. Click "Allow Access from Anywhere" (adds 0.0.0.0/0)
5. Click "Confirm"

This option is simpler but less secure. It's suitable for development but for production, consider using Option 2.

##### Option 2: Whitelist Render's IP Addresses

1. Log in to your MongoDB Atlas account
2. Navigate to Network Access under Security in the left sidebar
3. Click "Add IP Address"
4. Add the IP addresses of your Render service (you can find these in the Render logs when your service attempts to connect)
5. Add a comment like "Render Service" to identify this entry
6. Click "Confirm"

You may need to deploy your application first to see the connection attempts in the logs, then add those IP addresses to the whitelist.

#### Troubleshooting Connection Issues

If you're still having issues connecting to MongoDB, verify that:
- Your MongoDB Atlas cluster is properly configured
- The connection string in `dbconfig.ts` is correct
- The environment variables for MongoDB are set correctly
- Your MongoDB Atlas user has the correct permissions
- Your MongoDB Atlas cluster is in an active state

### Environment Variables

If certain features aren't working, double-check that all environment variables are set correctly in the Render dashboard.

## Updating the Application

To update your application:

1. Push changes to your repository
2. Render will automatically detect the changes and redeploy your application

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
