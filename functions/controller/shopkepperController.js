const db = require("../config/firebase");
const { encrypt , decrypt } = require("../encryption/crypto");


exports.getAllCustomerWithShopkeeperId = async (req, res) => {

    try {
        const data = req.body;
        const ref = await db.collection("users").add(data);
        res.status(200).send({ id: ref.id, message: "User added!" });
    } catch (err) {
        res.status(500).send(err);
    }


}


exports.getAllCustomerWithShopkeeperId = async (req, res) => {

    try {
        const data = req.body;
        const ref = await db.collection("users").add(data);
        res.status(200).send({ id: ref.id, message: "User added!" });
    } catch (err) {
        res.status(500).send(err);
    }


}
