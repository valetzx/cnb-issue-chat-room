const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 存储房间数据（实际应用中应使用数据库）
let rooms = [];

// 检查是否有预设房间，如果没有则添加
const presetRoomExists = rooms.some(room => room.url === 'https://cnb.cool/wss/apps/cnb-room/-/issues/2');
if (!presetRoomExists) {
    rooms.push({
        id: uuidv4(),
        name: '预设聊天室',
        url: 'https://cnb.cool/wss/apps/cnb-room/-/issues/2',
        repo: 'wss/apps/cnb-room',
        issueID: '2',
        createdAt: new Date().toISOString()
    });
}

// 中间件
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 处理跨域请求
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// API 路由 - 房间管理
app.get('/api/rooms', (req, res) => {
    res.json(rooms);
});

app.post('/api/rooms', (req, res) => {
    const { name, url, repo, issueID } = req.body;
    
    if (!name || !url || !repo || !issueID) {
        return res.status(400).json({ error: '缺少必要的房间信息' });
    }
    
    const newRoom = {
        id: uuidv4(),
        name,
        url,
        repo,
        issueID,
        createdAt: new Date().toISOString()
    };
    
    rooms.push(newRoom);
    res.status(201).json(newRoom);
});

// API 路由 - 消息管理
app.get('/api/messages', async (req, res) => {
    try {
        const { repo, issueID, page = 1, page_size = 20, token } = req.query;
        
        if (!repo || !issueID || !token) {
            return res.status(400).json({ error: '缺少必要的参数' });
        }
        
        const apiUrl = `https://api.cnb.cool/${repo}/-/issues/${issueID}/comments?page=${page}&page_size=${page_size}`;
        
        const response = await axios.get(apiUrl, {
            headers: {
                'accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        // 按创建时间正序排列，确保最新消息在底部
        const sortedMessages = response.data.sort((a, b) => 
            new Date(a.created_at) - new Date(b.created_at)
        );
        
        res.json(sortedMessages);
    } catch (error) {
        console.error('获取消息失败:', error.response?.data || error.message);
        res.status(500).json({ 
            error: '获取消息失败', 
            details: error.response?.data || error.message 
        });
    }
});

app.post('/api/messages', async (req, res) => {
    try {
        const { repo, issueID, token, body } = req.body;
        
        if (!repo || !issueID || !token || !body) {
            return res.status(400).json({ error: '缺少必要的参数' });
        }
        
        const apiUrl = `https://api.cnb.cool/${repo}/-/issues/${issueID}/comments`;
        
        const response = await axios.post(apiUrl, { body }, {
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('发送消息失败:', error.response?.data || error.message);
        res.status(500).json({ 
            error: '发送消息失败', 
            details: error.response?.data || error.message 
        });
    }
});

// 首页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});