// Importa il modello Pagamento
const Pagamento = require('./models/pagamento');

module.exports = function(app, passport, stripe) {

    const User = require('./models/user');
    const Group = require('./models/branca');
    const Payment = require('./models/pagamento');

    // Rotta pagina admin
    app.get('/admin', isAdmin, async function(req, res) {
        try {
            const groups = await Group.find().populate('members');
            const users = await User.find();
            const payments = await Payment.find().populate('groupId').populate('userId');
    
            res.render('pages/admin/admin', { 
                user: req.user, 
                groups: groups, 
                payments: payments,
                users: users  // Passa gli utenti alla vista
            });
        } catch (err) {
            console.error(err);
            res.status(500).send('Errore del server');
        }
    });
    

    app.post('/admin/payments', isAdmin, async function(req, res) {
        const { descrizione, importo, scadenza, assignedTo, groupId, userId } = req.body;
    
        // Verifica che tutti i campi obbligatori siano presenti
        if (!descrizione || !importo || !scadenza || !assignedTo) {
            req.flash('error', 'Tutti i campi obbligatori devono essere compilati!');
            return res.redirect('/admin');
        }
    
        try {
            // Crea un nuovo pagamento
            const newPayment = new Payment({
                descrizione: descrizione,
                importo: importo,
                scadenza: scadenza,
                userId: assignedTo === 'individual' ? userId : undefined,
                groupId: assignedTo === 'group' ? groupId : undefined,
                perTutti: assignedTo === 'all' ? true : false
            });
    
            // Salva il pagamento nel database
            await newPayment.save();
    
            // Successo: Redirect alla pagina admin
            res.redirect('/admin');
        } catch (error) {
            console.error('Errore durante il salvataggio del pagamento:', error);
            req.flash('error', 'Si è verificato un errore durante la creazione del pagamento!');
            res.redirect('/admin');
        }
    });

    // Rotta per creare un gruppo
    app.post('/admin/groups', isAdmin, async function(req, res) {
        const { name, members } = req.body;
        const newGroup = new Group({ name, members });
        await newGroup.save();
        res.redirect('/admin');
    });

    // Funzione middleware per verificare se l'utente è admin
    function isAdmin(req, res, next) {
        if (req.isAuthenticated() && req.user.admin) {
            return next();
        }
        res.redirect('/');
    }

    // Home page
    app.get('/', function(req, res) {
        res.render('pages/index', { user: req.user });
    });

    // Login page
    app.get('/login', function(req, res) {
        res.render('pages/auth/login', { message: req.flash('loginMessage'), user: req.user });
    });

    // Logout
    app.get('/logout', function(req, res, next) {
        req.logout(err => {
            if (err) return next(err);
            res.redirect('/');
        });
    });

    app.get('/profile', async (req, res) => {
        if (!req.user) {
            return res.redirect('/login');  // Se l'utente non è autenticato, reindirizza alla pagina di login
        }
    
        const userId = req.user._id;
    
        try {
            const userGroups = await Group.find({ members: userId });    
            const pagamenti = await Pagamento.find({
                $or: [
                  { groupId: { $in: userGroups.map(group => group._id) } },
                  { perTutti: true }
                ]
            });
    
            res.render('pages/profile/profile', { user: req.user, pagamenti: pagamenti, key: process.env.PUBLISHABLE_KEY });
        } catch (error) {
            console.error("Errore durante il recupero dei pagamenti:", error);
            res.status(500).send("Errore nel recupero dei pagamenti.");
        }
    });

    app.post('/payment', async function (req, res) {
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: req.body.descrizione
                        },
                        unit_amount: req.body.amount * 100
                    },
                    quantity: 1
                }         
            ],
            mode: 'payment',
            success_url: `${process.env.BASE_URL}/complete?session_id={CHECKOUT_SESSION_ID}&payementId=${req.body.id}`,
            cancel_url: `${process.env.BASE_URL}/cancel`
        })
    
        res.redirect(session.url)
    })

    app.get('/complete', async (req, res) => {
        const result = Promise.all([
            stripe.checkout.sessions.retrieve(req.query.session_id, { expand: ['payment_intent.payment_method'] }),
            stripe.checkout.sessions.listLineItems(req.query.session_id)
        ])

        if (!req.user.pagamentiEffettuati.includes(req.query.payementId)) {
            req.user.pagamentiEffettuati.push(req.query.payementId);  
            await req.user.save();  
        }
    
        console.log(JSON.stringify(await result))
    
        res.redirect('/profile')
    })

    app.get('/cancel', (req, res) => {
        res.redirect('/')
    })

    // Rotta per ottenere gli utenti non appartenenti al gruppo
    app.get('/admin/get-users-not-in-group/:groupId', isAdmin, async function(req, res) {
        const groupId = req.params.groupId;

        try {
            // Recupera il gruppo
            const group = await Group.findById(groupId).populate('members');

            // Ottieni gli ID degli utenti già nel gruppo
            const memberIds = group.members.map(member => member._id);

            // Recupera gli utenti che NON appartengono al gruppo
            const users = await User.find({ _id: { $nin: memberIds } });

            res.json(users);
        } catch (error) {
            console.error("Errore nel recupero degli utenti non nel gruppo:", error);
            res.status(500).send("Errore nel recupero degli utenti.");
        }
    });


    app.post('/admin/groups', isAdmin, async function(req, res) {
        const { name, members } = req.body;
        
        // Verifica che il nome del gruppo sia fornito
        if (!name || !members) {
            req.flash('error', 'Nome del gruppo e membri devono essere forniti!');
            return res.redirect('/admin');
        }
    
        try {
            const membersArray = members.map(memberId => mongoose.Types.ObjectId(memberId)); // Converti gli ID degli utenti in ObjectId
            const newGroup = new Group({ name, members: membersArray });
    
            await newGroup.save();
            res.redirect('/admin');
        } catch (error) {
            console.error('Errore durante la creazione del gruppo:', error);
            req.flash('error', 'Errore nella creazione del gruppo!');
            res.redirect('/admin');
        }
    });
    
    // Rotta per modificare i membri di un gruppo
    app.post('/admin/groups/:groupId/edit', isAdmin, async function(req, res) {
        const groupId = req.params.groupId;
        const { membersToAdd } = req.body; // ID degli utenti da aggiungere
    
        try {
            const group = await Group.findById(groupId);
            
            if (!group) {
                req.flash('error', 'Gruppo non trovato!');
                return res.redirect('/admin');
            }
    
            // Aggiungi i membri al gruppo
            group.members.push(...membersToAdd.map(memberId => mongoose.Types.ObjectId(memberId)));
            await group.save();
    
            res.redirect('/admin');
        } catch (error) {
            console.error('Errore durante la modifica del gruppo:', error);
            req.flash('error', 'Errore nell\'aggiornamento del gruppo!');
            res.redirect('/admin');
        }
    });


    // Login POST
    app.post('/login', passport.authenticate('local-login', {
        successRedirect: '/profile',
        failureRedirect: '/login',
        failureFlash: true
    }));

    // Altre pagine pubbliche
    app.get('/branche', function(req, res) {
        res.render('pages/publics/branche', { user: req.user });
    });

    app.get('/story', function(req, res) {
        res.render('pages/publics/story', { user: req.user });
    });

    app.get('/events', function(req, res) {
        res.render('pages/publics/events', { user: req.user });
    });

    // Forgot password
    app.get('/forgot-pass', function(req, res) {
        res.render('pages/auth/forgotPass');
    });

    // About page
    app.get('/about', function(req, res) {
        res.render('pages/about', { user: req.user });
    });
};
