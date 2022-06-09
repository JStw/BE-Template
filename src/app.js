const express = require('express');
const bodyParser = require('body-parser');
const {sequelize} = require('./model')
const AdminController = require('./controllers/admin.controller')
const ContractController = require('./controllers/contract.controller')
const JobController = require('./controllers/job.controller')
const BalanceController = require('./controllers/balance.controller')
const {getProfile, getAdminProfile} = require('./middleware/getProfile')
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const app = express();

app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerDocument));

const controllers = {
    contract: new ContractController(),
    job: new JobController(),
    balance: new BalanceController(),
    admin: new AdminController()
};

const routes = [
    {
        method: 'get',
        route: '/v1/contracts',
        middleware: getProfile,
        function: controllers.contract.getContracts
    },
    {
        method: 'get',
        route: '/v1/contracts/:id',
        middleware: getProfile,
        function: controllers.contract.getContract
    },
    {
        method: 'get',
        route: '/v1/jobs/unpaid',
        middleware: getProfile,
        function: controllers.job.getJobsUnpaid
    },
    {
        method: 'post',
        route: '/v1/jobs/:job_id/pay',
        middleware: getProfile,
        function: controllers.job.payJob
    },
    {
        method: 'post',
        route: '/v1/balances/deposit/:userId',
        middleware: getProfile,
        function: controllers.balance.deposit
    },
    {
        method: 'get',
        route: '/v1/admin/best-profession',
        middleware: getAdminProfile,
        function: controllers.admin.getBestProfession
    },
    {
        method: 'get',
        route: '/v1/admin/best-clients',
        middleware: getAdminProfile,
        function: controllers.admin.getBestClients
    }
];

routes.forEach(element => {
    // Binding context is not really usefull here but anyway
    app[element.method](element.route, element.middleware, element.function.bind(this));
})

module.exports = app;
