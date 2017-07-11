exports.toJson = (csv) => {
    let keys = [];
    let rows = [];
    let data = [];
    if (typeof csv == 'string') {
        rows = csv.split('\n');
        keys = rows.shift().split(';');
    }
    rows.forEach((row) => {
        let rowColumns = row.split(';');
        let json = {};
        for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
            json[keys[keyIndex]] = rowColumns[keyIndex];
        }
        data.push(json);
    });
    return data;
};