const ValidationError = require('../errors/validation');

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

module.exports = class UserService {
    
    constructor(bcrypt, userModel) {
        this.bcrypt = bcrypt;
        this.userModel = userModel;
    }

    async getMe(id) {
        return await this.userModel.findById(id, {
            // Remove fields we don't want to send back.
            password: 0,
            premiumEndDate: 0
        });
    }

    async getById(id) {
        return await this.userModel.findById(id, {
            // Remove fields we don't want to send back.
            password: 0,
            premiumEndDate: 0,
            credits: 0,
            email: 0,
            emailEnabled: 0,
            username: 0
        });
    }

    async create(user) {
        const newUser = new this.userModel(user);
    
        newUser.password = await this.bcrypt.hash(newUser.password, 10);

        let doc = await newUser.save();

        return doc._id;
    }

    async userExists(email) {
        let user = await this.userModel.findOne({
            email: email
        });

        return user != null;
    }

    async updateEmailPreference(id, preference) {
        let user = await this.userModel.findById(id);

        user.emailEnabled = preference;

        return await user.save();
    }

    async updateEmailAddress(id, email) {
        let user = await this.userModel.findById(id);
        
        if (await this.userExists(email)) {
            throw new ValidationError('Cannot change your email address, the new email address is already in use by another account.');
        }

        user.email = email;

        return await user.save();
    }

    async updateUsername(id, username) {
        let user = await this.userModel.findById(id);
        
        user.username = username;

        return await user.save();
    }

    async updatePassword(id, currentPassword, newPassword) {
        let user = await this.userModel.findById(id);
        
        // Make sure the current password matches.
        let result = await this.bcrypt.compare(currentPassword, user.password);

        if (result) {
            // Update the current password to the new password.
            let hash = await this.bcrypt.hash(newPassword, 10);
            
            user.password = hash;

            return await user.save();
        } else {
            throw new ValidationError('The current password is incorrect.');
        }
    }

    async requestResetPassword(email) {
        let user = await this.userModel.findOne({
            email
        });

        if (user == null) {
            throw new ValidationError(`An account does not exist with the email address: ${email}`);
        }

        user.resetPasswordToken = uuidv4();

        await user.save();

        return user.resetPasswordToken;
    }

    async resetPassword(resetPasswordToken, newPassword) {
        let user = await this.userModel.findOne({
            resetPasswordToken
        });

        if (user == null) {
            throw new ValidationError(`The token is invalid.`);
        }
        
        // Update the current password to the new password.
        let hash = await this.bcrypt.hash(newPassword, 10);
        
        user.password = hash;
        user.resetPasswordToken = null;

        await user.save();
    }

};
