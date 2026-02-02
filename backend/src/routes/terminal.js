import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const router = express.Router();
const execAsync = promisify(exec);

// Get platform-specific defaults
const isWindows = os.platform() === 'win32';
const homeDir = os.homedir();
const defaultDir = isWindows
  ? path.join(homeDir, 'Desktop')
  : '/home/pi2/Desktop';

// Execute command
router.post('/execute', async (req, res) => {
  try {
    const { command, cwd } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    // Security: Whitelist allowed commands
    const allowedCommands = isWindows
      ? ['dir', 'echo', 'type', 'cd', 'npm', 'node', 'git', 'cls', 'where', 'powershell']
      : ['ls', 'pwd', 'cat', 'echo', 'npm', 'node', 'git', 'cd', 'which'];

    const cmdStart = command.trim().split(' ')[0].toLowerCase();

    if (!allowedCommands.includes(cmdStart)) {
      return res.status(403).json({
        error: 'Command not allowed',
        message: `Only ${allowedCommands.join(', ')} commands are allowed`
      });
    }

    const workingDir = cwd || defaultDir;

    // Use shell based on platform
    const shellOptions = isWindows
      ? { shell: 'powershell.exe' }
      : { shell: '/bin/bash' };

    const { stdout, stderr } = await execAsync(command, {
      cwd: workingDir,
      timeout: 30000,
      maxBuffer: 1024 * 1024,
      ...shellOptions
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
    const targetPath = dirPath || defaultDir;

    // Resolve and validate path
    const resolvedPath = path.resolve(targetPath);

    // Security: Must be within home directory or its subdirectories
    if (!resolvedPath.startsWith(homeDir)) {
      return res.status(403).json({ error: 'Access denied - outside home directory' });
    }

    const files = await fs.readdir(resolvedPath, { withFileTypes: true });

    const fileList = await Promise.all(files.map(async file => {
      const filePath = path.join(resolvedPath, file.name);
      let size = 0;
      let modified = null;

      try {
        const stats = await fs.stat(filePath);
        size = stats.size;
        modified = stats.mtime;
      } catch (e) {
        // Ignore stat errors
      }

      return {
        name: file.name,
        type: file.isDirectory() ? 'folder' : 'file',
        path: filePath,
        size,
        modified
      };
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

    const resolvedPath = path.resolve(filePath);

    // Security check
    if (!resolvedPath.startsWith(homeDir)) {
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

    const resolvedPath = path.resolve(filePath);

    // Security check
    if (!resolvedPath.startsWith(homeDir)) {
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
    home: homeDir,
    desktop: defaultDir,
    platform: os.platform()
  });
});

export default router;
