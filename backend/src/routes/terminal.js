import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const execAsync = promisify(exec);

// Execute command
router.post('/execute', async (req, res) => {
  try {
    const { command, cwd } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    // Security: Whitelist allowed commands
    const allowedCommands = ['ls', 'pwd', 'cat', 'echo', 'claude', 'gemini', 'npm', 'node', 'git'];
    const cmdStart = command.trim().split(' ')[0];

    if (!allowedCommands.includes(cmdStart)) {
      return res.status(403).json({
        error: 'Command not allowed',
        message: `Only ${allowedCommands.join(', ')} commands are allowed`
      });
    }

    const workingDir = cwd || '/home/pi2/Desktop';

    const { stdout, stderr } = await execAsync(command, {
      cwd: workingDir,
      timeout: 30000, // 30 seconds
      maxBuffer: 1024 * 1024 // 1MB
    });

    res.json({
      success: true,
      stdout: stdout || '',
      stderr: stderr || '',
      command,
      cwd: workingDir
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stdout: error.stdout || '',
      stderr: error.stderr || ''
    });
  }
});

// List directory
router.get('/files', async (req, res) => {
  try {
    const { path: dirPath } = req.query;
    const targetPath = dirPath || '/home/pi2/Desktop';

    // Security: Prevent directory traversal
    const resolvedPath = path.resolve(targetPath);
    if (!resolvedPath.startsWith('/home/pi2')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const files = await fs.readdir(resolvedPath, { withFileTypes: true });

    const fileList = files.map(file => ({
      name: file.name,
      type: file.isDirectory() ? 'folder' : 'file',
      path: path.join(resolvedPath, file.name)
    }));

    res.json({
      path: resolvedPath,
      files: fileList
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Read file
router.get('/files/read', async (req, res) => {
  try {
    const { path: filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    // Security check
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith('/home/pi2')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const content = await fs.readFile(resolvedPath, 'utf-8');

    res.json({
      path: resolvedPath,
      content
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Write file
router.post('/files/write', async (req, res) => {
  try {
    const { path: filePath, content } = req.body;

    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'File path and content are required' });
    }

    // Security check
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith('/home/pi2')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await fs.writeFile(resolvedPath, content, 'utf-8');

    res.json({
      success: true,
      path: resolvedPath,
      message: 'File written successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current working directory
router.get('/cwd', (req, res) => {
  res.json({
    cwd: process.cwd(),
    home: '/home/pi2',
    desktop: '/home/pi2/Desktop'
  });
});

export default router;
