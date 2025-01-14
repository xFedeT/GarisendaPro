const mongoose = require('mongoose');

const pagamentoSchema = new mongoose.Schema({
    descrizione: { type: String, required: true },
    importo: { type: Number, required: true },
    scadenza: { type: Date, required: true },
    pagato: { type: Boolean, default: false },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branca' }, // Aggiungi il riferimento al modello 'Group'
    perTutti: { type: Boolean, default: false }
});

module.exports = mongoose.model('Pagamento', pagamentoSchema);