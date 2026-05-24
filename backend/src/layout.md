src/
│
├── app.js
│
├── config/
│   ├── db.js
│   └── env.js
│
├── models/
│   ├── User.js
│   └── Room.js
│
├── controllers/
│   ├── auth.controller.js
│   └── room.controller.js
│
├── routes/
│   ├── auth.routes.js
│   └── room.routes.js
│
├── middleware/
│   ├── auth.js
│   └── errorHandler.js
│
├── socket/
│   ├── socketServer.js
│   ├── roomHandlers.js
│   └── activeRooms.js
│
├── services/
│   ├── room.service.js
│   └── cleanup.service.js
│
├── utils/
│   └── jwt.js
│
└── jobs/
    └── roomCleanup.js