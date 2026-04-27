class SaveManager {
    constructor() {
        this.saveKey = 'bloodySnakeSave';
    }
    
    save(data) {
        const saveData = {
            ...data,
            savedAt: Date.now()
        };
        localStorage.setItem(this.saveKey, JSON.stringify(saveData));
    }
    
    load() {
        const saveDataStr = localStorage.getItem(this.saveKey);
        if (!saveDataStr) return null;
        
        try {
            return JSON.parse(saveDataStr);
        } catch (e) {
            console.error('存档读取失败:', e);
            return null;
        }
    }
    
    hasSaveData() {
        return localStorage.getItem(this.saveKey) !== null;
    }
    
    clearSave() {
        localStorage.removeItem(this.saveKey);
    }
}

window.SaveManager = SaveManager;
