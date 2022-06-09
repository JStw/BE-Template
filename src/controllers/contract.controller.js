const {Op} = require('sequelize');
const {Profile} = require("../model");

class ContractController {
    constructor() {
    }

    /**
     * @api {get} /contracts Returns a list of contracts non terminated belonging to a user (client or contractor)
     * @apiName getContracts
     * @apiPermission logged-in
     * @apiDescription Returns a list of contracts non terminated belonging to a user (client or contractor)
     * @apiSuccess (Success 204) If no results found
     * @apiSuccess (Success 200) {Object[]} result Contains database records about the contracts
     * @apiError (Error 4XX) 401 Authentication failed
     * @apiError (Error 5XX) 500 Database error
     */
    async getContracts(req, res) {
        const {Contract} = req.app.get('models')
        const profile = req.profile.get({plain: true})
        const alias = profile.type === 'client' ? 'Client' : 'Contractor';

        try {
            const contracts = await Contract.findAll({
                where: {status: {[Op.ne]: 'terminated'}},
                include: [
                    {
                        model: Profile,
                        as: alias,
                        attributes: ['id'],
                        where: {
                            id: profile.id
                        }
                    }
                ]
            })

            if (!contracts?.length) {
                return res.status(204).end()
            }

            res.json(contracts)
        } catch (e) {
            return res.status(500).json({
                error: `Something went wrong with database call, err: ${e.message || 'unknown'}`
            })
        }
    }

    /**
     * @api {get} /contracts/:id Return a contract that belong to an user
     * @apiName getContract
     * @apiPermission logged-in
     * @apiDescription Return a contract that belong to an user
     * @apiParam (Path) {Number} id A contract id
     * @apiSuccess (Success 200) {Object} result Contains database records about the best profession
     * @apiError (Error 4XX) 401 Authentication failed
     * @apiError (Error 4XX) 404 Contract not found in database
     * @apiError (Error 5XX) 500 Database error
     */
    async getContract(req, res) {
        const {Contract} = req.app.get('models')
        const {id} = req.params
        const profile = req.profile.get({plain: true})
        const alias = profile.type === 'client' ? 'Client' : 'Contractor';

        try {
            const contract = await Contract.findOne({
                where: {id},
                include: [
                    {
                        model: Profile,
                        attributes: ['id'],
                        as: alias,
                        where: {
                            id: profile.id
                        }
                    }
                ]
            })

            if (!contract) {
                return res.status(204).end()
            }

            res.json(contract)
        } catch (e) {
            return res.status(500).json({
                error: `Something went wrong with database call, err: ${e.message || 'unknown'}`
            })
        }
    }
}

module.exports = ContractController;
