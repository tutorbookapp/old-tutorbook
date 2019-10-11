class Utils {

    constructor() {}

    static getPronoun(gender) {
        switch (gender) {
            case 'Male':
                return 'his';
            case 'Female':
                return 'her';
            default:
                return 'their';
        }
    }
};


module.exports = Utils;