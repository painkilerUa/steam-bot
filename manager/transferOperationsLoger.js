/**
 * Log trade information
 * 
 * @class TransferOperationsLoger
 */

/**
 * task info JSON
 * {
 *      task_id: '1',
 *      botId: '123465789456789'
 *      steamId: '123456789789',
 *      tradeLink: 'https://steamcommunity.com/tradeoffer/new/?partner=372340245&token=TO0vjXzE',
 *      item: {
 *          classid: '1246578',
 *          instanceid: '0'
 *      }
 * }
 */


class TransferOperationsLoger {
    constructor() {
        this.transferOprationList = [];
    }

    /**
     * Add new task informatin
     * 
     * @param {any} newTransferTask 
     * 
     * @memberOf TransferOperationsLoger
     */
    add(newTransferTask) {
        if (!newTransferTask) {
            throw new Error('"newTransferTask" cant\'t be "undefined"');
        }
        if (!newTransferTask.task_id) {
            throw new Error('"newTransferTask.task_id" cant\'t be "undefined"');
        }
        newTransferTask.date = new Date();
        this.transferOprationList.push(newTransferTask);
    }

    /**
     * Delete task info form tasks log list
     * 
     * @param {any} Id 
     * 
     * @memberOf TransferOperationsLoger
     */
    delete(Id) {
        this.transferOprationList = this.transferOprationList.filter((taskInfo) => {
            return taskInfo.task_id != Id;
        });
    }

    /**
     * Return task info and remove them from list
     * 
     * @param {any} Id 
     * @returns 
     * 
     * @memberOf TransferOperationsLoger
     */
    close(Id) {
        let task = this.transferOprationList.find((taskInfo) => {
            return taskInfo.task_id == Id;
        });
        this.delete(task.task_id);
        return task;
    }

    /**
     * Return task info and remove them from list
     * 
     * @param {any} offerId 
     * @returns 
     * 
     * @memberOf TransferOperationsLoger
     */
    closeByOfferId(offerId) {
        let task = this.transferOprationList.find((taskInfo) => {
            return taskInfo.offerId == offerId;
        });
        console.log('closeByOfferId task', task)
        this.delete(task.task_id);
        return task;
    }

    /**
     * Return task info
     * 
     * @param {any} offerId 
     * @returns 
     * 
     * @memberOf TransferOperationsLoger
     */
    getByOfferId(offerId) {
        return this.transferOprationList.find((taskInfo) => {
            return taskInfo.offerId == offerId;
        });
    }

    /**
     * Update task info
     * 
     * @param {any} transferTask 
     * 
     * @memberOf TransferOperationsLoger
     */
    update(transferTask) {
        throw new Error('Method not implemented');
    }
}

module.exports = TransferOperationsLoger