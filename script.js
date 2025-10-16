// Dream Garden Memorial - JavaScript

class DreamGardenMemorial {
  constructor() {
    this.currentUser = { id: `user_${Date.now()}`, username: 'Anonymous' };
    this.memories = [];
    this.draggedElement = null;
    this.apiBaseUrl = 'http://localhost:3000/api';
    this.activeTool = null;
    this.candles = [];
    this.flowers = [];
    this.letters = [];
    this.isDraggingItembar = false;
    this.isCarving = false;
    this.carvingCanvas = null;
    this.carvingCtx = null;
    this.carvingHistory = []; // 存储雕刻历史，用于撤销
    this.itembarDragOffset = { x: 0, y: 0 };
    this.isDragging = false; // 简化的拖拽标志
    this.dragJustEnded = false; // 拖拽刚结束标志
    
    this.init();
  }

  init() {
    this.addNotificationStyles();
    this.setupEventListeners();
    this.setupCandlePlacement();
    this.setupItembarDrag();
    this.loadUserData();
    this.loadMemories();
    this.loadPublicMemorials();
    this.loadMineGardenFromLocal();
  }

  setupEventListeners() {
    // 导航按钮
    document.getElementById('nav-my-space').addEventListener('click', () => this.switchPage('my-space'));
    document.getElementById('nav-public-space').addEventListener('click', () => this.switchPage('public-space'));

    // 文件上传 - 我的空间
    document.getElementById('upload-btn').addEventListener('click', () => {
      console.log('Upload button clicked');
      document.getElementById('file-input').click();
    });
    document.getElementById('file-input').addEventListener('change', (e) => this.handleFileUpload(e));

    // 创建我的花园按钮
    document.getElementById('create-mine-btn').addEventListener('click', () => {
      this.createMineGarden();
    });

    // 蜡烛工具
    document.getElementById('candle-tool').addEventListener('click', () => {
      this.selectTool('candle');
    });

    // 花朵工具
    document.getElementById('flower-tool').addEventListener('click', () => {
      this.selectTool('flower');
    });

    // 信封工具
    document.getElementById('envelope-tool').addEventListener('click', () => {
      this.selectTool('envelope');
    });

    // 雕刻刀工具
    document.getElementById('knife-tool').addEventListener('click', () => {
      this.selectTool('knife');
    });

    // 模态框关闭
    document.querySelectorAll('.close').forEach(closeBtn => {
      closeBtn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
    });

    // 信纸模态框事件
    document.getElementById('close-letter').addEventListener('click', () => {
      this.closeModal(document.getElementById('letter-modal'));
    });
    document.getElementById('save-letter').addEventListener('click', () => {
      this.saveLetter();
    });
    document.getElementById('cancel-letter').addEventListener('click', () => {
      this.closeModal(document.getElementById('letter-modal'));
    });

    // 设置默认解封时间为1小时后
    const now = new Date();
    now.setHours(now.getHours() + 1);
    document.getElementById('unlock-time').value = now.toISOString().slice(0, 16);
    
    // No Time Lock按钮事件
    document.getElementById('no-time-btn').addEventListener('click', () => {
      document.getElementById('unlock-time').value = '';
    });

    // 点击模态框外部关闭
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal);
        }
      });
    });


  }

  switchPage(pageId) {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });

    // 显示目标页面
    document.getElementById(pageId).classList.add('active');

    // 更新导航按钮状态
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.getElementById(`nav-${pageId}`).classList.add('active');

    // 页面特定逻辑
    if (pageId === 'public-space') {
      this.loadPublicMemorials();
    }
  }

  closeModal(modal) {
    modal.classList.remove('show');
  }

  createMineGarden() {
    // 检查是否已经存在MINE花园
    const existingCard = document.querySelector('.mine-garden-card');
    if (existingCard) {
      this.showNotification('Your garden already exists!', 'info');
        return;
    }
    
    // 创建MINE花园卡片
    const container = document.getElementById('public-memorials');
    const card = document.createElement('div');
    card.className = 'memorial-card mine-garden-card';
    card.innerHTML = `
      <h3>🌟 MINE</h3>
      <p>Click to visit my personal memorial garden</p>
    `;
    
    // 点击卡片切换到我的空间
    card.onclick = () => {
      this.switchPage('my-space');
      this.showNotification('Welcome to your garden!', 'info');
    };

    // 将卡片添加到列表顶部
    container.insertBefore(card, container.firstChild);

    // 保存到本地存储
    this.saveMineGardenToLocal();

    this.showNotification('Your garden has been created! Other users can now visit it.', 'success');
  }

  selectTool(toolName) {
    console.log('selectTool called with:', toolName);
    // 取消之前选中的工具
    document.querySelectorAll('.tool-item').forEach(item => {
      item.classList.remove('active');
    });

      if (this.activeTool === toolName) {
        // 如果点击的是已选中的工具，取消选择
        this.activeTool = null;
        document.body.classList.remove('candle-cursor', 'flower-cursor', 'envelope-cursor', 'knife-cursor');
        document.getElementById('itemarea').classList.remove('candle-cursor', 'flower-cursor', 'envelope-cursor', 'knife-cursor');
        this.hideTombstoneCanvas();
        this.hideUndoButton();
        this.showNotification('Tool deselected', 'info');
      } else {
      // 选择新工具
      this.activeTool = toolName;
      document.getElementById(`${toolName}-tool`).classList.add('active');
      
      if (toolName === 'candle') {
        document.body.classList.add('candle-cursor');
        document.getElementById('itemarea').classList.add('candle-cursor');
        this.hideUndoButton();
        this.showNotification('Candle tool selected. Click to place candles.', 'info');
      } else if (toolName === 'flower') {
        document.body.classList.add('flower-cursor');
        document.getElementById('itemarea').classList.add('flower-cursor');
        this.hideUndoButton();
        this.showNotification('Flower tool selected. Click to place flowers.', 'info');
      } else if (toolName === 'envelope') {
        document.body.classList.add('envelope-cursor');
        document.getElementById('itemarea').classList.add('envelope-cursor');
        this.hideUndoButton();
        this.showNotification('Letter tool selected. Click to write a letter.', 'info');
      } else if (toolName === 'knife') {
        document.body.classList.add('knife-cursor');
        document.getElementById('itemarea').classList.add('knife-cursor');
        this.showTombstoneCanvas();
        this.showUndoButton();
        this.showNotification('Carving tool selected. Draw on the tombstone to carve.', 'info');
      }
    }
  }

  setupCandlePlacement() {
    const itemArea = document.getElementById('itemarea');
    
    // 在 itemArea 上添加 mousedown 监听器，用于在新的交互开始时重置 dragJustEnded 标志
    itemArea.addEventListener('mousedown', (e) => {
      if (this.dragJustEnded) {
        console.log('DEBUG: Mouse down on itemArea. Resetting dragJustEnded flag to FALSE.');
        this.dragJustEnded = false;
      }
    });

    itemArea.addEventListener('click', (e) => {
      console.log('Click event:');
      console.log('  activeTool:', this.activeTool);
      console.log('  isDragging (global):', this.isDragging);
      console.log('  dragJustEnded (global):', this.dragJustEnded);
      console.log('  target:', e.target);

      // 如果刚结束拖拽，强制阻止点击事件
      if (this.dragJustEnded) {
        console.log('Skipping click: dragJustEnded is TRUE. Preventing default and stopping propagation for this click.');
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      // 如果正在拖拽，不创建新物品
      if (this.isDragging) {
        console.log('Skipping: isDragging');
        return;
      }
      
      // 如果点击的是已放置的物品，不创建新物品
      if (e.target.closest('.candle-placed') || e.target.closest('.flower-placed') || e.target.closest('.letter-placed')) {
        console.log('Skipping: clicked on placed item');
        return;
      }
      
      if (this.activeTool === 'candle') {
        console.log('Creating candle');
    e.preventDefault();
        e.stopPropagation();
        
        const rect = itemArea.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.placeCandle(x, y);
      } else if (this.activeTool === 'flower') {
        console.log('Creating flower');
    e.preventDefault();
        e.stopPropagation();
        
        const rect = itemArea.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.placeFlower(x, y);
      } else if (this.activeTool === 'envelope') {
        console.log('Opening letter interface');
        e.preventDefault();
        e.stopPropagation();
        
        this.openLetterInterface();
      } else {
        console.log('No active tool selected');
      }
    });
  }

  setupItembarDrag() {
    const itembar = document.getElementById('itembar');
    
    itembar.addEventListener('mousedown', (e) => {
      // 只有在点击物品栏本身时才启动拖动，不是点击内部元素
      if (e.target === itembar || e.target.classList.contains('itembar-content')) {
        this.isDraggingItembar = true;
        const rect = itembar.getBoundingClientRect();
        this.itembarDragOffset.x = e.clientX - rect.left;
        this.itembarDragOffset.y = e.clientY - rect.top;
        
        itembar.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDraggingItembar) {
        const x = e.clientX - this.itembarDragOffset.x;
        const y = e.clientY - this.itembarDragOffset.y;
        
        // 限制在屏幕范围内
        const maxX = window.innerWidth - itembar.offsetWidth;
        const maxY = window.innerHeight - itembar.offsetHeight;
        
        const constrainedX = Math.max(0, Math.min(x, maxX));
        const constrainedY = Math.max(0, Math.min(y, maxY));
        
        itembar.style.left = `${constrainedX}px`;
        itembar.style.top = `${constrainedY}px`;
        itembar.style.transform = 'none';
        itembar.style.bottom = 'auto';
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isDraggingItembar) {
        this.isDraggingItembar = false;
        itembar.style.cursor = 'move';
        }
    });
}

  placeCandle(x, y) {
    const candleId = `candle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 创建蜡烛元素
    const candle = document.createElement('div');
    candle.className = 'candle-placed';
    candle.dataset.candleId = candleId;
    candle.style.left = `${x - 54}px`;
    candle.style.top = `${y - 54}px`;
    
    // 创建蜡烛图片
    const candleImg = document.createElement('img');
    candleImg.src = 'candle.png';
    candleImg.alt = 'Candle';
    candleImg.style.width = '100%';
    candleImg.style.height = '100%';
    candleImg.style.objectFit = 'contain';
    candleImg.style.imageRendering = 'pixelated';
    candleImg.style.imageRendering = 'crisp-edges';
    
    // 如果图片加载失败，使用emoji作为后备
    candleImg.onerror = () => {
      candleImg.style.display = 'none';
      candle.innerHTML = '🕯️';
      candle.style.fontSize = '48px';
      candle.style.display = 'flex';
      candle.style.alignItems = 'center';
      candle.style.justifyContent = 'center';
    };
    
    candle.appendChild(candleImg);
    
    // 添加点击事件来切换光晕
    candle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCandleGlow(candleId);
    });

    // 添加拖拽功能
    this.setupDrag(candle, 'candle', candleId);
    
    // 添加到场景
    document.getElementById('itemarea').appendChild(candle);
    
    // 保存蜡烛数据
    this.candles.push({
      id: candleId,
      x: x,
      y: y,
      isLit: false,
      element: candle
    });
    
    this.showNotification('Candle placed! Click to light, drag to move.', 'success');
  }

  placeFlower(x, y) {
    const flowerId = `flower_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 创建花朵元素
    const flower = document.createElement('div');
    flower.className = 'flower-placed';
    flower.dataset.flowerId = flowerId;
    flower.style.left = `${x - 54}px`;
    flower.style.top = `${y - 54}px`;
    
    // 创建花朵图片
    const flowerImg = document.createElement('img');
    flowerImg.src = 'flower.png';
    flowerImg.alt = 'Flower';
    flowerImg.style.width = '100%';
    flowerImg.style.height = '100%';
    flowerImg.style.objectFit = 'contain';
    flowerImg.style.imageRendering = 'pixelated';
    flowerImg.style.imageRendering = 'crisp-edges';
    
    // 如果图片加载失败，使用emoji作为后备
    flowerImg.onerror = () => {
      flowerImg.style.display = 'none';
      flower.innerHTML = '🌸';
      flower.style.fontSize = '48px';
      flower.style.display = 'flex';
      flower.style.alignItems = 'center';
      flower.style.justifyContent = 'center';
    };
    
    flower.appendChild(flowerImg);
    
    // 添加拖拽功能
    this.setupDrag(flower, 'flower', flowerId);
    
    // 添加到场景
    document.getElementById('itemarea').appendChild(flower);
    
    // 保存花朵数据
    this.flowers.push({
      id: flowerId,
      x: x,
      y: y,
      element: flower
    });
    
    this.showNotification('Flower placed! Drag to move.', 'success');
  }

  removeFlower(flowerId) {
    const flower = this.flowers.find(f => f.id === flowerId);
    if (flower) {
      // 从DOM中移除
      flower.element.remove();
      
      // 从数组中移除
      this.flowers = this.flowers.filter(f => f.id !== flowerId);
      
      this.showNotification('Flower removed', 'info');
    }
  }

  setupDrag(element, type, id) {
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let startTime = 0;
    let hasMoved = false;
    let startX = 0;
    let startY = 0;
    let dragJustEnded = false;

    const handleMouseMove = (e) => {
      if (!isDragging && !hasMoved) {
        // 检测是否开始拖拽 - 增加时间延迟和距离阈值
        const threshold = 15; // 增加距离阈值
        const timeElapsed = Date.now() - startTime;
        const distance = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
        
        // 只有在鼠标按下超过200ms且移动距离超过阈值时才认为是拖拽
        if (timeElapsed > 200 && distance > threshold) {
          hasMoved = true;
          isDragging = true;
          this.isDragging = true;
          this.dragJustEnded = false;
          element.style.cursor = 'grabbing';
          console.log('Drag started - movement detected');
        }
      }
      
      if (isDragging) {
        // 根据不同类型使用不同的偏移量
        let offset = 54; // 默认偏移量（蜡烛、花朵、信封）
        if (type === 'memory') {
          offset = 75; // 记忆图片的偏移量
        }
        
        // 鼠标位置减去偏移量，使图像中心跟随鼠标
        const x = e.clientX - dragOffset.x - offset;
        const y = e.clientY - dragOffset.y - offset;
        
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        element.style.transform = 'none';
        
        // 更新数据中的位置（图像中心位置）
        if (type === 'candle') {
          const candle = this.candles.find(c => c.id === id);
          if (candle) {
            candle.x = x + 54; // 54是图像宽度的一半
            candle.y = y + 54; // 54是图像高度的一半
            
            // 如果蜡烛是点亮的，同时移动火光
            if (candle.isLit) {
              const glow = document.querySelector(`[data-candle-id="${id}"].candle-glow`);
              if (glow) {
                // 火光位置 = 蜡烛中心位置 - 火光中心偏移
                // candle.x 和 candle.y 已经是蜡烛中心位置
                glow.style.left = `${candle.x - 100}px`;
                glow.style.top = `${candle.y - 100}px`;
              }
            }
          }
        } else if (type === 'flower') {
          const flower = this.flowers.find(f => f.id === id);
          if (flower) {
            flower.x = x + 54; // 54是图像宽度的一半
            flower.y = y + 54; // 54是图像高度的一半
          }
        } else if (type === 'letter') {
          const letter = this.letters.find(l => l.id === id);
          if (letter) {
            letter.x = x + 54; // 54是信封宽度的一半
            letter.y = y + 54; // 54是信封高度的一半
          }
        } else if (type === 'memory') {
          const memory = this.memories.find(m => m.id === id);
          if (memory) {
            memory.x = x + 75; // 75是记忆图片宽度的一半
            memory.y = y + 75; // 75是记忆图片高度的一半
          }
        }
        
        // 检查是否拖拽到垃圾桶附近，添加高亮效果
        const trashBin = document.getElementById('trash-bin');
        const trashRect = trashBin.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        // 检查是否与垃圾桶重叠
        const isOverTrash = !(elementRect.right < trashRect.left || 
                             elementRect.left > trashRect.right || 
                             elementRect.bottom < trashRect.top || 
                             elementRect.top > trashRect.bottom);
        
        if (isOverTrash) {
          trashBin.classList.add('drag-over');
        } else {
          trashBin.classList.remove('drag-over');
        }
      }
    };

    const handleMouseUp = (e) => {
      if (isDragging) {
        // 拖动结束
        isDragging = false;
        this.isDragging = false;
        dragJustEnded = true;
        element.style.cursor = 'grab';
        
        console.log('Drag ended, resetting isDragging');
        
        // 检查是否拖拽到垃圾桶
        const trashBin = document.getElementById('trash-bin');
        const trashRect = trashBin.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        // 检查是否与垃圾桶重叠
        const isOverTrash = !(elementRect.right < trashRect.left || 
                             elementRect.left > trashRect.right || 
                             elementRect.bottom < trashRect.top || 
                             elementRect.top > trashRect.bottom);
        
        if (isOverTrash) {
          // 拖拽到垃圾桶，删除物品
          console.log('Item dragged to trash, deleting:', type, id);
          this.deleteItem(type, id);
        }
        
        // 移除垃圾桶的高亮效果
        trashBin.classList.remove('drag-over');
        
        // 阻止事件冒泡，防止触发点击事件
        e.preventDefault();
        e.stopPropagation();
        
        // 立即设置全局标志
        this.dragJustEnded = true;
        console.log('DEBUG: this.dragJustEnded set to TRUE in handleMouseUp:', this.dragJustEnded);
        
        // 延迟重置拖拽标志，确保点击事件被正确阻止
        setTimeout(() => {
          this.dragJustEnded = false;
          console.log('DEBUG: this.dragJustEnded reset to FALSE after delay');
        }, 100);
        
        // 移除事件监听器
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      } else {
        // 没有拖拽，允许点击事件正常触发
        console.log('No drag detected, allowing click event');
        hasMoved = false;
        this.isDragging = false;
        
        // 移除事件监听器
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
    };

    element.addEventListener('mousedown', (e) => {
      startTime = Date.now();
      hasMoved = false;
      isDragging = false;
      dragJustEnded = false;
      this.isDragging = false;
      this.dragJustEnded = false;
      
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = element.getBoundingClientRect();
      // 计算鼠标相对于图像中心的偏移量
      dragOffset.x = e.clientX - (rect.left + rect.width / 2);
      dragOffset.y = e.clientY - (rect.top + rect.height / 2);
      e.preventDefault();
      e.stopPropagation();
      
      console.log('Mouse down on', type, 'element');
      
      // 添加拖动事件监听器
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });
  }


  isOverlapping(rect1, rect2) {
    return !(rect1.right < rect2.left || 
             rect1.left > rect2.right || 
             rect1.bottom < rect2.top || 
             rect1.top > rect2.bottom);
  }

  removeCandle(candleId) {
    const candle = this.candles.find(c => c.id === candleId);
    if (candle) {
      // 移除光晕
      const glow = document.querySelector(`[data-candle-id="${candleId}"].candle-glow`);
      if (glow) {
        glow.remove();
      }
      
      // 从DOM中移除
      candle.element.remove();
      
      // 从数组中移除
      this.candles = this.candles.filter(c => c.id !== candleId);
      
      this.showNotification('Candle removed', 'info');
    }
  }

  toggleCandleGlow(candleId) {
    const candle = this.candles.find(c => c.id === candleId);
    let glow = document.querySelector(`[data-candle-id="${candleId}"].candle-glow`);
    
    if (candle) {
      if (candle.isLit) {
        // 熄灭蜡烛 - 移除光晕
        if (glow) {
          glow.remove();
        }
        candle.isLit = false;
        this.showNotification('Candle extinguished', 'info');
            } else {
        // 点燃蜡烛 - 创建光晕
        if (!glow) {
          glow = document.createElement('div');
          glow.className = 'candle-glow';
          glow.dataset.candleId = candleId;
          glow.style.left = `${candle.x - 100}px`;
          glow.style.top = `${candle.y - 100}px`;
          
          // 将光晕添加到蜡烛元素之前
          candle.element.parentNode.insertBefore(glow, candle.element);
        }
        glow.classList.add('intense');
        candle.isLit = true;
        this.showNotification('Candle lit!', 'success');
      }
    }
  }

  async uploadFile(file) {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('userId', this.currentUser.id);

      const response = await fetch(`${this.apiBaseUrl}/memory`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const memoryData = await response.json();
        return memoryData;
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      // 离线模式：创建本地内存数据
      const memoryData = {
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        imageUrl: URL.createObjectURL(file),
        filename: file.name,
        hp: 100,
        createdAt: new Date().toISOString()
      };
      return memoryData;
    }
  }

  async handleFileUpload(e) {
    console.log('handleFileUpload called');
    const file = e.target.files[0];
    if (!file) {
      console.log('No file selected');
      return;
    }
    console.log('File selected:', file.name, file.type);

    if (!file.type.startsWith('image/')) {
      this.showNotification('Please select an image file.', 'error');
      return;
    }

    try {
      const memoryData = await this.uploadFile(file);
      console.log('Memory data created:', memoryData);
      
      // 直接放置在场景中，就像花朵一样
      const x = Math.random() * (window.innerWidth - 200) + 100;
      const y = Math.random() * (window.innerHeight - 200) + 100;
      this.placeMemoryInScene(memoryData, x, y);
      
      this.showNotification('Memory uploaded and placed in scene!', 'success');
    } catch (error) {
      console.error('Error uploading file:', error);
      this.showNotification('Failed to upload image', 'error');
    }

    // 重置文件输入
    e.target.value = '';
  }

  placeMemoryInScene(memoryData, x, y) {
    console.log('placeMemoryInScene called with:', memoryData, x, y);
    
    // 创建记忆元素
    const memory = document.createElement('div');
    memory.className = 'memory-placed';
    memory.dataset.memoryId = memoryData.id;
    memory.style.left = `${x - 60}px`; // 60是图像宽度的一半 (120px)
    memory.style.top = `${y - 60}px`; // 60是图像高度的一半 (120px)
    
    // 创建记忆图片容器
    const memoryContainer = document.createElement('div');
    memoryContainer.style.cssText = `
      position: relative;
      display: inline-block;
      animation: floating 3s ease-in-out infinite;
    `;
    
    // 创建像素相框
    const pixelFrame = document.createElement('div');
    pixelFrame.className = 'pixel-frame';
    pixelFrame.style.cssText = `
      width: 120px;
      height: 120px;
      background: transparent;
      padding: 2px;
      position: relative;
    `;
    
    
    // 创建记忆图片
    const memoryImg = document.createElement('img');
    memoryImg.src = memoryData.imageUrl;
    memoryImg.alt = memoryData.filename || 'Memory';
    memoryImg.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.7;
      transition: opacity 0.3s ease;
    `;
    
    pixelFrame.appendChild(memoryImg);
    
    // 创建生命值条
    const lifeBar = document.createElement('div');
    lifeBar.className = 'memory-life-bar';
    lifeBar.style.cssText = `
      position: absolute;
      bottom: -12px;
      left: 0;
      right: 0;
      width: 120px;
      height: 6px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 3px;
      overflow: hidden;
    `;
    
    const lifeFill = document.createElement('div');
    lifeFill.className = 'memory-life-fill high';
    lifeFill.style.height = '100%';
    lifeFill.style.width = '100%';
    lifeFill.style.backgroundColor = '#4CAF50';
    lifeFill.style.transition = 'width 0.3s ease, background-color 0.3s ease';
    
    lifeBar.appendChild(lifeFill);
    memoryContainer.appendChild(pixelFrame);
    memoryContainer.appendChild(lifeBar);
    memory.appendChild(memoryContainer);
    
    // 添加点击事件来预览图片
    memory.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // 检查是否刚结束拖拽
      if (this.dragJustEnded) {
        console.log('Memory click blocked: dragJustEnded is true');
        e.preventDefault();
        return;
      }
      
      console.log('Memory click allowed: opening preview');
      this.previewMemory(memoryData, memory);
    });
    
    // 添加拖拽功能
    this.setupDrag(memory, 'memory', memoryData.id);
    
    // 添加到场景
    const itemarea = document.getElementById('itemarea');
    console.log('Adding memory to itemarea:', itemarea);
    itemarea.appendChild(memory);
    console.log('Memory added to scene successfully');
    
    // 保存记忆数据到数组中
    if (!this.memories) {
      this.memories = [];
    }
    
    // 检查是否已存在相同的记忆
    const existingIndex = this.memories.findIndex(m => m.id === memoryData.id);
    if (existingIndex !== -1) {
      // 更新现有记忆的位置
      this.memories[existingIndex].x = x;
      this.memories[existingIndex].y = y;
      this.memories[existingIndex].element = memory;
    } else {
      // 添加新记忆
      this.memories.push({
        id: memoryData.id,
        x: x,
        y: y,
        imageUrl: memoryData.imageUrl,
        filename: memoryData.filename,
        element: memory,
        hp: memoryData.hp || 100,
        maxHp: 100,
        createdAt: memoryData.createdAt || new Date().toISOString(),
        isPreviewing: false,
        lifeFill: lifeFill,
        memoryImg: memoryImg
      });
    }
    
    // 保存到本地存储
    this.saveMemoriesToLocal();
    
    // 开始生命值衰减
    this.startMemoryLifeDecay(memoryData.id);
  }

  previewMemory(memoryData, memoryElement) {
    const memory = this.memories.find(m => m.id === memoryData.id);
    if (!memory || memory.isPreviewing) return;
    
    memory.isPreviewing = true;
    
    // 创建预览模态框
    const modal = document.createElement('div');
    modal.className = 'memory-preview-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      cursor: pointer;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      max-width: 80vw;
      max-height: 80vh;
      width: auto;
      height: auto;
      position: relative;
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      align-items: center;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 15px;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
    `;
    
    const img = document.createElement('img');
    img.src = memoryData.imageUrl;
    img.style.cssText = `
      max-width: 70vw;
      max-height: 60vh;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 4px;
      border: 2px solid #ddd;
    `;
    
    modalContent.appendChild(closeBtn);
    modalContent.appendChild(img);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // 关闭事件
    const closeModal = () => {
      document.body.removeChild(modal);
      memory.isPreviewing = false;
      
      // 恢复生命值
      memory.hp = Math.min(100, memory.hp + 30);
      this.updateMemoryLifeDisplay(memory);
      
      this.showNotification('Memory life restored!', 'success');
    };
    
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  updateMemoryLifeDisplay(memory) {
    const lifeFill = memory.lifeFill;
    const memoryImg = memory.memoryImg;
    
    if (lifeFill) {
      lifeFill.style.width = `${memory.hp}%`;
      
      // 更新生命值条颜色
      if (memory.hp > 70) {
        lifeFill.style.backgroundColor = '#4CAF50';
        lifeFill.className = 'memory-life-fill high';
      } else if (memory.hp > 40) {
        lifeFill.style.backgroundColor = '#FF9800';
        lifeFill.className = 'memory-life-fill medium';
      } else {
        lifeFill.style.backgroundColor = '#F44336';
        lifeFill.className = 'memory-life-fill low';
      }
    }
    
    // 更新图片透明度 - 随生命值减少而减小
    if (memoryImg) {
      if (memory.hp <= 0) {
        // 生命值为0时，开始淡出动画
        memoryImg.style.transition = 'opacity 2s ease-out';
        memoryImg.style.opacity = '0';
        
        // 2秒后删除记忆
        setTimeout(() => {
          this.removeMemory(memory.id);
        }, 2000);
      } else {
        // 透明度随生命值线性减少：70%基础透明度 + 生命值百分比
        const baseOpacity = 0.7;
        const lifeOpacity = (memory.hp / 100) * 0.3; // 生命值贡献0-30%透明度
        const totalOpacity = baseOpacity + lifeOpacity;
        memoryImg.style.opacity = totalOpacity.toString();
      }
    }
  }

  startMemoryLifeDecay(memoryId) {
    const memory = this.memories.find(m => m.id === memoryId);
    if (!memory) return;
    
    // 每10秒减少1%生命值
    const decayInterval = setInterval(() => {
      const currentMemory = this.memories.find(m => m.id === memoryId);
      if (!currentMemory) {
        clearInterval(decayInterval);
        return;
      }
      
      if (!currentMemory.isPreviewing) {
        currentMemory.hp = Math.max(0, currentMemory.hp - 1);
        this.updateMemoryLifeDisplay(currentMemory);
        this.saveMemoriesToLocal();
      }
    }, 10000);
    
    // 保存间隔ID以便后续清理
    memory.decayInterval = decayInterval;
  }



  async loadMemories() {
    if (!this.currentUser) return;

    try {
      const response = await fetch(`${this.apiBaseUrl}/memory/my?userId=${this.currentUser.id}`);
      if (response.ok) {
        const memories = await response.json();
        this.memories = memories;
        this.renderMemories();
      }
    } catch (error) {
      console.error('Load memories error:', error);
      // 离线模式：从本地存储加载
      this.loadMemoriesFromLocal();
    }
  }

  saveMemoriesToLocal() {
    localStorage.setItem('dreamGardenMemories', JSON.stringify(this.memories));
  }

  loadMemoriesFromLocal() {
    const localMemories = JSON.parse(localStorage.getItem('dreamGardenMemories') || '[]');
    this.memories = localMemories;
    this.renderMemories();
  }

  renderMemories() {
    // 清空现有记忆元素
    document.querySelectorAll('.memory-placed').forEach(memory => memory.remove());
    
    // 渲染记忆元素
    this.memories.forEach(memory => {
      if (memory.x && memory.y && memory.imageUrl && !memory.element) {
        this.placeMemoryInScene(memory, memory.x, memory.y);
      }
    });
  }

  async loadPublicMemorials() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/public-memorials`);
      if (response.ok) {
        const memorials = await response.json();
        this.renderPublicMemorials(memorials);
      }
    } catch (error) {
      console.error('Load public memorials error:', error);
      // 显示示例数据
      this.renderPublicMemorials([
        { id: 'demo1', username: 'Dreamer1', memorialText: 'In Memory of Joy', isPublic: true },
        { id: 'demo2', username: 'Dreamer2', memorialText: 'Remembering Love', isPublic: true }
      ]);
    }
  }

  renderPublicMemorials(memorials) {
    const container = document.getElementById('public-memorials');
    container.innerHTML = '';

    // 首先添加MINE花园（如果存在）
    this.loadMineGardenFromLocal();

    memorials.forEach(memorial => {
      const card = document.createElement('div');
      card.className = 'memorial-card';
      card.innerHTML = `
        <h3>${memorial.username}'s Garden</h3>
        <p>${memorial.memorialText}</p>
      `;
      card.onclick = () => this.visitMemorial(memorial.id);
      container.appendChild(card);
    });
  }

  addMyMemorySpaceToPublic() {
    // 检查是否已经存在我的空间模块
    const existingCard = document.querySelector('.my-memory-space-card');
    if (existingCard) {
      existingCard.remove();
    }

    // 创建新的"MY MEMORY SPACE"卡片
    const container = document.getElementById('public-memorials');
    const card = document.createElement('div');
    card.className = 'memorial-card my-memory-space-card';
    card.innerHTML = `
      <div class="my-space-header">
        <h3>🌱 MY MEMORY SPACE</h3>
        <div class="memory-count">${this.memories.length} memories</div>
      </div>
      <p>Click to visit your personal memorial garden</p>
      <div class="my-space-preview">
        <div class="preview-memories">
          ${this.generateMemoryPreview()}
        </div>
      </div>
    `;
    
    // 点击卡片切换到我的空间
    card.onclick = () => {
      this.switchPage('my-space');
      this.showNotification('Welcome to your personal space!', 'info');
    };

    // 将卡片添加到列表顶部
    container.insertBefore(card, container.firstChild);

    // 保存到本地存储，以便页面刷新后仍然显示
    this.saveMyMemorySpaceToLocal();
  }

  generateMemoryPreview() {
    // 显示最近上传的3个记忆的缩略图
    const recentMemories = this.memories.slice(0, 3);
    return recentMemories.map(memory => `
      <div class="preview-thumbnail">
        <img src="${memory.imageUrl}" alt="Memory preview" />
      </div>
    `).join('');
  }

  saveMyMemorySpaceToLocal() {
    const mySpaceData = {
      id: this.currentUser.id,
      username: this.currentUser.username,
      memorialText: 'MY MEMORY SPACE',
      isPublic: true,
      memoryCount: this.memories.length,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('dreamGardenMySpace', JSON.stringify(mySpaceData));
  }

  saveMineGardenToLocal() {
    const mineGardenData = {
      id: this.currentUser.id,
      username: this.currentUser.username,
      gardenName: 'MINE',
      isPublic: true,
      created: new Date().toISOString()
    };
    localStorage.setItem('dreamGardenMine', JSON.stringify(mineGardenData));
  }

  loadMineGardenFromLocal() {
    const mineGardenData = localStorage.getItem('dreamGardenMine');
    if (mineGardenData) {
      const data = JSON.parse(mineGardenData);
      // 如果MINE花园数据存在，添加到公共空间显示
      this.addMineGardenToPublic();
    }
  }

  addMineGardenToPublic() {
    // 检查是否已经存在MINE花园
    const existingCard = document.querySelector('.mine-garden-card');
    if (existingCard) {
      return; // 已经存在，不重复添加
    }

    // 创建MINE花园卡片
    const container = document.getElementById('public-memorials');
    const card = document.createElement('div');
    card.className = 'memorial-card mine-garden-card';
    card.innerHTML = `
      <h3>🌟 MINE</h3>
      <p>Click to visit my personal memorial garden</p>
    `;
    
    // 点击卡片切换到我的空间
    card.onclick = () => {
      this.switchPage('my-space');
      this.showNotification('Welcome to your garden!', 'info');
    };

    // 将卡片添加到列表顶部
    container.insertBefore(card, container.firstChild);
  }

  loadMyMemorySpaceFromLocal() {
    const mySpaceData = localStorage.getItem('dreamGardenMySpace');
    if (mySpaceData) {
      const data = JSON.parse(mySpaceData);
      // 如果我的空间数据存在，添加到公共空间显示
      this.addMyMemorySpaceToPublic();
    }
  }

  visitMemorial(memorialId) {
    // 显示访客模态框
    document.getElementById('visitor-modal').classList.add('show');
    // 这里可以加载特定纪念馆的数据
    this.showNotification(`Visiting ${memorialId}'s memorial...`, 'info');
  }


  async saveMemoryPosition(memoryId, x, y) {
    try {
      await fetch(`${this.apiBaseUrl}/memory/${memoryId}/position`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ x, y })
      });
    } catch (error) {
      console.error('Save position error:', error);
      // 离线模式：更新本地数据
      const memories = JSON.parse(localStorage.getItem('dreamGardenMemories') || '[]');
      const memoryIndex = memories.findIndex(m => m.id === memoryId);
      if (memoryIndex !== -1) {
        memories[memoryIndex].x = x;
        memories[memoryIndex].y = y;
        localStorage.setItem('dreamGardenMemories', JSON.stringify(memories));
      }
    }
  }

  loadUserData() {
    // 自动创建匿名用户
    this.currentUser = { id: `user_${Date.now()}`, username: 'Anonymous' };
    this.loadMemories();
  }

  showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      background: ${type === 'success' ? '#A8E6CF' : type === 'error' ? '#FFCCBC' : '#BBDEFB'};
      color: #607D8B;
      padding: 10px 15px;
      border: 2px solid #607D8B;
      font-family: 'Press Start 2P', monospace;
      font-size: 8px;
      z-index: 3000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    // 3秒后自动移除
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // 添加CSS动画
  addNotificationStyles() {
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        
        @keyframes floating {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .drag-over {
          background: rgba(187, 222, 251, 0.3) !important;
          border: 2px dashed #BBDEFB !important;
        }
        
        .memory-placed {
          position: absolute;
          cursor: grab;
          z-index: 10;
          transition: transform 0.2s ease;
        }
        
        .memory-placed:hover {
          transform: scale(1.05);
          z-index: 20;
          animation-play-state: paused;
        }
        
        .memory-placed:active {
          cursor: grabbing;
        }
      `;
      document.head.appendChild(style);
    }
  }

  // 信封相关方法
  openLetterInterface() {
    const modal = document.getElementById('letter-modal');
    const textarea = document.getElementById('letter-content');
    const saveBtn = document.getElementById('save-letter');
    const cancelBtn = document.getElementById('cancel-letter');
    const unlockTime = document.getElementById('unlock-time');
    
    // 清空文本区域
    textarea.value = '';
    textarea.readOnly = false;
    
    // 重置时间胶囊设置
    unlockTime.value = '';
    // 设置默认解封时间为1小时后
    const now = new Date();
    now.setHours(now.getHours() + 1);
    unlockTime.value = now.toISOString().slice(0, 16);
    
    // 重置按钮状态
    saveBtn.textContent = '💾 Save Letter';
    cancelBtn.textContent = '❌ Cancel';
    
    // 清除编辑状态
    delete modal.dataset.editingLetterId;
    
    // 显示模态框
    modal.classList.add('show');
    
    // 聚焦到文本区域
    setTimeout(() => {
      textarea.focus();
    }, 100);
  }

  saveLetter() {
    const modal = document.getElementById('letter-modal');
    const textarea = document.getElementById('letter-content');
    const content = textarea.value.trim();
    
    if (!content) {
      this.showNotification('Please write something in your letter!', 'warning');
      return;
    }
    
    // 检查时间胶囊设置
    const unlockTime = document.getElementById('unlock-time').value;
    let timeCapsuleData = null;
    
    // 如果填写了解封时间，则创建时间胶囊数据
    if (unlockTime) {
      const unlockDateTime = new Date(unlockTime);
      const now = new Date();
      
      if (unlockDateTime <= now) {
        this.showNotification('Unlock time must be in the future!', 'warning');
        return;
      }
      
      timeCapsuleData = {
        unlockTime: unlockDateTime,
        content: content,
        isTimeCapsule: true
      };
    }
    
    // 检查是否在编辑现有信件
    const editingLetterId = modal.dataset.editingLetterId;
    if (editingLetterId) {
      // 更新现有信件
      this.updateLetter(editingLetterId, content, timeCapsuleData);
      this.closeModal(modal);
      // 清除编辑状态
      delete modal.dataset.editingLetterId;
    } else {
      // 创建新信件
      const letterId = `letter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const x = Math.random() * (window.innerWidth - 200) + 100;
      const y = Math.random() * (window.innerHeight - 300) + 100;
      
      this.placeLetter(x, y, content, letterId, timeCapsuleData);
      
      // 关闭模态框
      this.closeModal(modal);
      
      if (timeCapsuleData) {
        this.scheduleTimeCapsule(timeCapsuleData);
        this.showNotification('Time capsule letter created!', 'success');
      } else {
        this.showNotification('Letter saved!', 'success');
      }
    }
  }

  placeLetter(x, y, content, letterId, timeCapsuleData = null) {
    // 创建信封元素
    const letter = document.createElement('div');
    letter.className = 'letter-placed';
    letter.dataset.letterId = letterId;
    letter.style.left = `${x - 54}px`; // 54是信封宽度的一半
    letter.style.top = `${y - 54}px`; // 54是信封高度的一半
    
    // 创建信封图片
    const letterImg = document.createElement('img');
    letterImg.src = 'envelope.png';
    letterImg.alt = 'Envelope';
    letterImg.style.width = '100%';
    letterImg.style.height = '100%';
    letterImg.style.objectFit = 'contain';
    letterImg.style.imageRendering = 'pixelated';
    letterImg.style.imageRendering = 'crisp-edges';
    
    // 如果图片加载失败，使用emoji作为后备
    letterImg.onerror = () => {
      letterImg.style.display = 'none';
      letter.innerHTML = '✉️';
      letter.style.fontSize = '48px';
      letter.style.display = 'flex';
      letter.style.alignItems = 'center';
      letter.style.justifyContent = 'center';
    };
    
    letter.appendChild(letterImg);
    
    // 添加点击事件来查看信纸内容
    letter.addEventListener('click', (e) => {
      e.stopPropagation();
      this.viewLetter(letterId);
    });
    
    // 添加拖拽功能
    this.setupDrag(letter, 'letter', letterId);
    
    // 添加到场景
    document.getElementById('itemarea').appendChild(letter);
    
    // 保存信纸数据
    this.letters.push({
      id: letterId,
      x: x,
      y: y,
      content: content,
      element: letter,
      timeCapsuleData: timeCapsuleData
    });
  }

  viewLetter(letterId) {
    const letter = this.letters.find(l => l.id === letterId);
    if (letter) {
      // 检查时间胶囊是否已解封
      if (letter.timeCapsuleData) {
        const now = new Date();
        const unlockTime = new Date(letter.timeCapsuleData.unlockTime);
        
        if (now < unlockTime) {
          // 时间胶囊未解封，显示解封时间提示
          const timeRemaining = unlockTime.getTime() - now.getTime();
          const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
          
          let timeText = '';
          if (days > 0) {
            timeText = `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''}`;
          } else if (hours > 0) {
            timeText = `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
          } else {
            timeText = `${minutes} minute${minutes > 1 ? 's' : ''}`;
          }
          
          this.showNotification(`Letter will unlock in: ${timeText}`, 'info');
          return;
        }
      }
      
      // 打开信纸界面查看内容
      const modal = document.getElementById('letter-modal');
      const textarea = document.getElementById('letter-content');
      const unlockTimeInput = document.getElementById('unlock-time');
      
      // 显示信件内容（只读模式）
      textarea.value = letter.content;
      textarea.readOnly = true;
      
      // 显示时间胶囊设置（如果有）
      if (letter.timeCapsuleData) {
        unlockTimeInput.value = letter.timeCapsuleData.unlockTime.toISOString().slice(0, 16);
      } else {
        unlockTimeInput.value = '';
      }
      
      // 修改按钮文本
      const saveBtn = document.getElementById('save-letter');
      const cancelBtn = document.getElementById('cancel-letter');
      saveBtn.textContent = '✏️ Edit Letter';
      cancelBtn.textContent = '❌ Close';
      
      // 存储当前编辑的信件ID
      modal.dataset.editingLetterId = letterId;
      
      // 移除之前的事件监听器并添加新的事件监听器
      saveBtn.replaceWith(saveBtn.cloneNode(true));
      const newSaveBtn = document.getElementById('save-letter');
      
      newSaveBtn.addEventListener('click', () => {
        if (textarea.readOnly) {
          // 进入编辑模式
          textarea.readOnly = false;
          textarea.focus();
          newSaveBtn.textContent = '💾 Save Changes';
          cancelBtn.textContent = '❌ Cancel';
        } else {
          // 保存修改
          const unlockTime = document.getElementById('unlock-time').value;
          let timeCapsuleData = null;
          
          if (unlockTime) {
            const unlockDateTime = new Date(unlockTime);
            timeCapsuleData = {
              unlockTime: unlockDateTime,
              content: textarea.value.trim(),
              isTimeCapsule: true
            };
          }
          
          this.updateLetter(letterId, textarea.value.trim(), timeCapsuleData);
          this.closeModal(modal);
          // 重置按钮状态
          newSaveBtn.textContent = '✏️ Edit Letter';
          cancelBtn.textContent = '❌ Close';
          textarea.readOnly = true;
        }
      });
      
      // 显示模态框
      modal.classList.add('show');
      
      // 聚焦到文本区域
      setTimeout(() => {
        textarea.focus();
      }, 100);
    }
  }

  updateLetter(letterId, newContent, timeCapsuleData = null) {
    const letter = this.letters.find(l => l.id === letterId);
    if (letter) {
      // 更新信件内容
      letter.content = newContent;
      letter.timeCapsuleData = timeCapsuleData;
      
      // 显示成功消息
      this.showNotification('信件已更新!', 'success');
      
      if (timeCapsuleData) {
        this.scheduleTimeCapsule(timeCapsuleData);
      }
    }
  }

  deleteItem(type, id) {
    if (type === 'candle') {
      this.removeCandle(id);
    } else if (type === 'flower') {
      this.removeFlower(id);
    } else if (type === 'letter') {
      this.removeLetter(id);
    } else if (type === 'memory') {
      this.removeMemory(id);
    }
  }

  removeLetter(letterId) {
    const letter = this.letters.find(l => l.id === letterId);
    if (letter) {
      // 从DOM中移除
      letter.element.remove();
      
      // 从数组中移除
      this.letters = this.letters.filter(l => l.id !== letterId);
      
      this.showNotification('Letter removed', 'info');
    }
  }

  removeMemory(memoryId) {
    const memory = this.memories.find(m => m.id === memoryId);
    if (memory) {
      // 清理生命值衰减间隔
      if (memory.decayInterval) {
        clearInterval(memory.decayInterval);
      }
      
      // 从DOM中移除
      memory.element.remove();
      
      // 从数组中移除
      this.memories = this.memories.filter(m => m.id !== memoryId);
      
      // 保存到本地存储
      this.saveMemoriesToLocal();
      
      this.showNotification('Memory removed', 'info');
    }
  }

  // 雕刻相关方法
  showTombstoneCanvas() {
    const tombstoneCanvas = document.getElementById('tombstone-canvas');
    const canvas = document.getElementById('carving-canvas');
    
    tombstoneCanvas.classList.add('active');
    
    // 初始化画布
    this.carvingCanvas = canvas;
    this.carvingCtx = canvas.getContext('2d');
    
    // 设置像素化渲染，确保像素清晰
    this.carvingCtx.imageSmoothingEnabled = false;
    this.carvingCtx.webkitImageSmoothingEnabled = false;
    this.carvingCtx.mozImageSmoothingEnabled = false;
    this.carvingCtx.msImageSmoothingEnabled = false;
    
    // 设置画布尺寸，使用像素化渲染
    canvas.width = 300;
    canvas.height = 400;
    canvas.style.width = '300px';
    canvas.style.height = '400px';
    
    // 画布保持透明，不填充背景
    
    // 初始化雕刻历史记录
    this.carvingHistory = [];
    this.saveCarvingState(); // 保存初始空白状态
    
    // 添加雕刻事件监听器
    this.setupCarvingEvents();
  }

  hideTombstoneCanvas() {
    const tombstoneCanvas = document.getElementById('tombstone-canvas');
    tombstoneCanvas.classList.remove('active');
    
    // 移除雕刻事件监听器
    this.removeCarvingEvents();
  }

  // 显示撤回按钮
  showUndoButton() {
    const trashBin = document.getElementById('trash-bin');
    if (trashBin) {
      trashBin.innerHTML = '↶';
      trashBin.title = '撤回雕刻 (Undo Carving)';
      trashBin.classList.add('undo-button');
      trashBin.style.display = 'block';
      
      // 添加撤回按钮点击事件
      trashBin.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.undoCarving();
      };
    }
  }

  // 隐藏撤回按钮，恢复垃圾桶
  hideUndoButton() {
    const trashBin = document.getElementById('trash-bin');
    if (trashBin) {
      trashBin.innerHTML = '🗑️';
      trashBin.title = '拖拽物品到此处删除';
      trashBin.classList.remove('undo-button');
      trashBin.onclick = null; // 移除撤回按钮的点击事件
    }
  }

  setupCarvingEvents() {
    const canvas = this.carvingCanvas;
    
    canvas.addEventListener('mousedown', (e) => {
      this.isCarving = true;
      // 在开始雕刻前保存当前状态
      this.saveCarvingState();
      this.startCarving(e);
    });
    
    canvas.addEventListener('mousemove', (e) => {
      if (this.isCarving) {
        this.continueCarving(e);
      }
    });
    
    canvas.addEventListener('mouseup', () => {
      if (this.isCarving) {
        this.isCarving = false;
      }
    });
    
    canvas.addEventListener('mouseleave', () => {
      if (this.isCarving) {
        this.isCarving = false;
      }
    });
  }

  removeCarvingEvents() {
    const canvas = this.carvingCanvas;
    if (canvas) {
      canvas.removeEventListener('mousedown', this.startCarving);
      canvas.removeEventListener('mousemove', this.continueCarving);
      canvas.removeEventListener('mouseup', this.stopCarving);
      canvas.removeEventListener('mouseleave', this.stopCarving);
    }
  }

  startCarving(e) {
    const rect = this.carvingCanvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (300 / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (400 / rect.height));
    
    this.carvePixel(x, y);
  }

  continueCarving(e) {
    const rect = this.carvingCanvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (300 / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (400 / rect.height));
    
    this.carvePixel(x, y);
  }

  carvePixel(x, y) {
    if (!this.carvingCtx) return;
    
    // 确保坐标在画布范围内（使用实际画布尺寸）
    const canvasWidth = 300;
    const canvasHeight = 400;
    if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) {
      return;
    }
    
    // 创建密集的像素雕刻效果，模拟凹陷感
    this.drawCarvingPixels(x, y);
  }

  drawCarvingPixels(x, y) {
    // 绘制7x7像素块，让雕刻更密集
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        const pixelX = x + dx;
        const pixelY = y + dy;
        
        // 确保像素在画布范围内
        if (pixelX >= 0 && pixelX < 300 && 
            pixelY >= 0 && pixelY < 400) {
          
          // 计算距离中心的距离，用于颜色渐变
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // 根据距离确定颜色，营造凹陷感
          if (distance <= 2) {
            // 中心区域：最深的凹陷色
            this.carvingCtx.fillStyle = '#000000';
          } else if (distance <= 3.5) {
            // 中间区域：中等深度
            this.carvingCtx.fillStyle = '#444444';
          } else {
            // 边缘区域：较浅的阴影
            this.carvingCtx.fillStyle = '#888888';
          }
          
          // 绘制1x1像素，让像素更密集
          this.carvingCtx.fillRect(pixelX, pixelY, 1, 1);
        }
      }
    }
    
    // 添加更多随机像素来增加密度
    if (Math.random() < 0.5) {
      const randomX = x + Math.floor(Math.random() * 7) - 3;
      const randomY = y + Math.floor(Math.random() * 7) - 3;
      
      if (randomX >= 0 && randomX < 300 && 
          randomY >= 0 && randomY < 400) {
        this.carvingCtx.fillStyle = '#444444';
        this.carvingCtx.fillRect(randomX, randomY, 1, 1);
      }
    }
  }


  // 撤销雕刻功能
  undoCarving() {
    if (this.carvingHistory.length <= 1) {
      this.showNotification('没有可撤销的雕刻', 'info');
      return;
    }
    
    // 移除当前状态，恢复到上一个状态
    this.carvingHistory.pop(); // 移除当前状态
    const previousState = this.carvingHistory[this.carvingHistory.length - 1]; // 获取上一个状态
    
    // 清空画布
    this.carvingCtx.clearRect(0, 0, 300, 400);
    
    // 重新绘制到上一个状态
    if (previousState) {
      this.carvingCtx.putImageData(previousState, 0, 0);
    }
    
    this.showNotification('撤销成功', 'success');
  }

// 保存雕刻状态到历史记录
  saveCarvingState() {
    if (this.carvingCanvas && this.carvingCtx) {
      const imageData = this.carvingCtx.getImageData(0, 0, this.carvingCanvas.width, this.carvingCanvas.height);
      this.carvingHistory.push(imageData);
      
      // 限制历史记录数量，避免内存过多占用
      if (this.carvingHistory.length > 20) {
        this.carvingHistory.shift();
      }
    }
  }

  // 时间胶囊调度功能
  scheduleTimeCapsule(timeCapsuleData) {
    const now = new Date();
    const delay = timeCapsuleData.unlockTime.getTime() - now.getTime();
    
    if (delay > 0) {
      // 使用setTimeout调度时间胶囊解封
      setTimeout(() => {
        this.unlockTimeCapsule(timeCapsuleData);
      }, delay);
      
      // 保存调度信息到本地存储
      const scheduledTimeCapsules = JSON.parse(localStorage.getItem('scheduledTimeCapsules') || '[]');
      scheduledTimeCapsules.push({
        id: `timeCapsule_${Date.now()}`,
        ...timeCapsuleData,
        scheduledAt: now.toISOString()
      });
      localStorage.setItem('scheduledTimeCapsules', JSON.stringify(scheduledTimeCapsules));
      
      this.showNotification(`Letter will unlock at ${timeCapsuleData.unlockTime.toLocaleString()}`, 'info');
    } else {
      this.showNotification('解封时间必须是未来时间!', 'warning');
    }
  }

  unlockTimeCapsule(timeCapsuleData) {
    // 时间胶囊解封
    console.log('Unlocking time capsule:', timeCapsuleData);
    
    // 显示时间胶囊解封通知
    this.showNotification(`💎 Letter unlocked! From your past self`, 'success');
    
    // 从本地存储中移除已解封的时间胶囊
    const scheduledTimeCapsules = JSON.parse(localStorage.getItem('scheduledTimeCapsules') || '[]');
    const updatedTimeCapsules = scheduledTimeCapsules.filter(capsule => 
      capsule.unlockTime !== timeCapsuleData.unlockTime.toISOString()
    );
    localStorage.setItem('scheduledTimeCapsules', JSON.stringify(updatedTimeCapsules));
    
    // 可以在这里添加更多解封后的逻辑，比如显示特殊效果
    this.showTimeCapsuleUnlockEffect();
  }

  // 检查并恢复页面刷新后的时间胶囊调度
  restoreScheduledTimeCapsules() {
    const scheduledTimeCapsules = JSON.parse(localStorage.getItem('scheduledTimeCapsules') || '[]');
    const now = new Date();
    
    scheduledTimeCapsules.forEach(timeCapsuleData => {
      const unlockTime = new Date(timeCapsuleData.unlockTime);
      const delay = unlockTime.getTime() - now.getTime();
      
      if (delay > 0) {
        setTimeout(() => {
          this.unlockTimeCapsule(timeCapsuleData);
        }, delay);
      } else if (delay > -60000) { // 如果延迟在1分钟内，立即解封
        this.unlockTimeCapsule(timeCapsuleData);
      }
    });
  }

  // 时间胶囊解封特效 - 信封动态光晕
  showTimeCapsuleUnlockEffect() {
    // 找到场景中的信封元素
    const letters = document.querySelectorAll('.letter-placed');
    if (letters.length === 0) return;
    
    // 为每个信封添加光晕效果
    letters.forEach(letter => {
      const envelope = letter.querySelector('.envelope');
      if (envelope) {
        envelope.classList.add('unlock-glow');
        
        // 3秒后移除光晕效果
        setTimeout(() => {
          envelope.classList.remove('unlock-glow');
        }, 3000);
      }
    });
    
    // 添加光晕动画样式
    if (!document.getElementById('envelope-glow-animation')) {
      const style = document.createElement('style');
      style.id = 'envelope-glow-animation';
      style.textContent = `
        @keyframes envelopeGlow {
          0%, 100% { 
            box-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
          }
          50% { 
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 30px rgba(255, 215, 0, 0.6);
          }
        }
        
        .envelope.unlock-glow {
          animation: envelopeGlow 1s ease-in-out infinite;
        }
      `;
      document.head.appendChild(style);
    }
  }




}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded - Initializing Dream Garden Memorial...');
  try {
    const app = new DreamGardenMemorial();
    console.log('Dream Garden Memorial app initialized successfully');
    // 恢复时间胶囊调度
    app.restoreScheduledTimeCapsules();
    console.log('Time capsule scheduler restored');
  } catch (error) {
    console.error('Error initializing Dream Garden Memorial:', error);
  }
});

// HP衰减系统（模拟）
setInterval(() => {
  document.querySelectorAll('.memory-module').forEach(module => {
    const hpFill = module.querySelector('.hp-fill');
    if (hpFill) {
      const currentHp = parseInt(hpFill.style.width) || 100;
      const newHp = Math.max(0, currentHp - 1);
      hpFill.style.width = `${newHp}%`;
      
      // 更新颜色
      hpFill.className = 'hp-fill';
      if (newHp > 70) {
        hpFill.classList.add('high');
      } else if (newHp > 30) {
        hpFill.classList.add('medium');
    } else {
        hpFill.classList.add('low');
      }
    }
  });
}, 30000); // 每30秒减少1% HP