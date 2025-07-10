import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import './ProductPage.css';
import productsData from '../db/products.json'; // Importer les produits
import reviewsData from '../db/reviews.json';  // Importer les avis
import { collection, addDoc, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from '../Firebase';  // Importer la config Firebase
import Swal from 'sweetalert2'; // Importer SweetAlert

const ProductPage = () => {
    const [selectedColor, setSelectedColor] = useState('');
    const airpodsMaxColors = [

        { name: 'أخضر', hex: '#28a745' }, // Green
        { name: 'أسود', hex: '#333333' }, // Black
        { name: 'أزرق', hex: '#007bff' }, // Blue
        { name: 'أحمر', hex: '#ff0000' }  // Red
    ];
    const [selectedPack, setSelectedPack] = useState(''); // Nouveau state pour le pack
    const airpodsProductNames = [
        'AirPods 3', 'AirPods 4', 'AirPods Pro 2', 'AirPods', 'AirPods USA', 'AirPods Pro', 'AirPods Pro USA'
    ]; // 'AirPods Max' retiré
    const packs = [
        {
            id: 'vip',
            name: '🔥 Pack VIP',
            price: 199,
            details: [
                '✅ AirPods USA',
                '✅ Pochette offerte',
                '✅ Spotify',
                '✅ Garantie + Livraison gratuite'
            ]
        },
        {
            id: 'smart',
            name: '💼 Pack Smart',
            price: 189,
            details: [
                '✅ AirPods USA',
                '✅ Pochette',
                '✅ Garantie + Livraison gratuite'
            ]
        },
        {
            id: 'solo',
            name: '🎧 USA Solo',
            price: 179,
            details: [
                '✅ AirPods USA فقط',
                '✅ Garantie + Livraison gratuite'
            ]
        }
    ];
    const { productId } = useParams(); // Get the productId from URL parameters
    const [product, setProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [price, setPrice] = useState(''); // Prix dynamique selon sélection
    const [isZoomed, setIsZoomed] = useState(false); // Pour gérer le zoom des images des avis
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        city: '',
        quantity: 'one' // Par défaut, une pièce
    });
    const [docId, setDocId] = useState(''); // Ajouter un état pour stocker l'ID
    const [nextId, setNextId] = useState(1); // L'ID incrémenté
    const [errors, setErrors] = useState({});

    // Références pour le scroll vers les champs
    const formRef = useRef(null);
    const nameRef = useRef(null);
    const phoneRef = useRef(null);
    const addressRef = useRef(null);
    const cityRef = useRef(null);

    // Fonction pour obtenir le prochain ID
    const getNextId = async () => {
        const q = query(collection(db, "formSubmissions"), orderBy("id", "desc"), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            setNextId(1); // Si aucune entrée, commencer à 1
        } else {
            const lastDoc = querySnapshot.docs[0].data();
            setNextId(lastDoc.id + 1); // Incrémenter le dernier ID trouvé
        }
    };

    useEffect(() => {
        
        getNextId(); // Appeler la fonction pour récupérer l'ID dès le chargement
    }, []);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name) {
            newErrors.name = "الاسم مطلوب";
        }
        if (!formData.phone) {
            newErrors.phone = "رقم الهاتف مطلوب";
        }
        if (!formData.address) {
            newErrors.address = "العنوان مطلوب";
        }
        if (!formData.city) {
            newErrors.city = "المدينة مطلوبة";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        // Validation du formulaire
        if (!validateForm()) {
            scrollToError();  // Scroll vers le champ manquant
            setTimeout(() => {
                Swal.fire({
                    title: 'خطأ!',
                    text: "يرجى التأكد من أنك قد ملأت جميع معلومات النموذج.",
                    icon: 'error',
                    confirmButtonText: 'حسناً'
                });
            }, 1200);
            return;
        }

        if (isAirpodsProduct && !selectedPack) {
            Swal.fire({
                title: 'يرجى اختيار الباك',
                text: 'اختر أحد الباقات المتوفرة قبل إتمام الطلب.',
                icon: 'warning',
                confirmButtonText: 'حسناً'
            });
            return;
        }

        // Ajoute la date et l'heure actuelles
        const currentDateTime = new Date();

        try {
            // Sélectionne le prix et la quantité en fonction de l'option choisie
            const selectedPrice = isAirpodsProduct && selectedPack ? packs.find(p => p.id === selectedPack).price : (formData.quantity === 'one' ? product.price : product.twoPrice);
            const quantitySelected = formData.quantity === 'one' ? 1 : 2;

            // Ajouter les données du formulaire à Firestore
            const docRef = await addDoc(collection(db, "formSubmissions"), {
                id: nextId, // Utiliser le prochain ID généré
                name: formData.name,
                phone: formData.phone,
                address: formData.address,
                city: formData.city,
                quantity: quantitySelected, // Enregistrer la quantité
                productTitle: product.name, // Enregistrer le titre du produit
                color: selectedColor,  // Save the selected color
                price: selectedPrice, // Enregistrer le prix selon la sélection
                date: currentDateTime.toLocaleDateString(),
                time: currentDateTime.toLocaleTimeString(),
                status: 'pending', // Statut par défaut
                pack: isAirpodsProduct ? selectedPack : undefined, // Enregistrer le pack si AirPods
                packLabel: isAirpodsProduct && selectedPack ? packs.find(p => p.id === selectedPack).name : undefined,
            });

            // Enregistrer l'ID du document dans l'état
            setDocId(docRef.id);

            // SweetAlert pour confirmation
            Swal.fire({
                title: '<h2 style="color: #4CAF50;">🎉 نجاح!</h2>',
                html: `
                    <p style="font-size: 18px; color: #333;">
                        تم تقديم النموذج بنجاح.<br> 
                        <strong>الرقم التعريفي:</strong> ${nextId}<br>
                        سنقوم بالاتصال بك في غضون لحظات لتأكيد الشراء وشحن الطرد الخاص بك. 
                        يرجى الاحتفاظ بهاتفك بالقرب منك.
                    </p>
                    <p style="font-size: 16px; color: #FF9800;">
                        📞 رجاءً، تأكد من أن هاتفك جاهز.
                    </p>
                `,
                icon: 'success',
                confirmButtonText: '<span style="font-size: 18px;">👌 حسناً</span>',
                background: '#f9f9f9',
                backdrop: `
                    rgba(0, 123, 255, 0.4)
                    url("/images/celebration.gif")
                    left top
                    no-repeat
                `,
                customClass: {
                    popup: 'animated tada'
                }
            });

            // Mettre à jour le prochain ID
            setNextId(nextId + 1);
        } catch (e) {
            // SweetAlert pour erreur
            Swal.fire({
                title: 'خطأ!',
                text: `خطأ أثناء تقديم النموذج: ${e.message}`,
                icon: 'error',
                confirmButtonText: 'حسناً'
            });
        }
    };

    // Fonction pour scroller vers le premier champ manquant en cas d'erreur
    const scrollToError = () => {
        document.getElementById('firstForm').scrollIntoView({ behavior: 'smooth' });
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };
    useEffect(() => {
        window.scrollTo(0, 0);  // Déplace la page en haut
    }, []);
    
    useEffect(() => {
        // Trouver le produit correspondant
        const foundProduct = productsData.find(p => p.id === parseInt(productId)); // Use productId
        setProduct(foundProduct || {});
        setReviews(reviewsData || []);

        // Définir le prix par défaut comme celui d'une seule pièce
        if (foundProduct) {
            setPrice(foundProduct.price);
        }

        // Si le produit est trouvé, définir l'image principale comme première image
        if (foundProduct && foundProduct.images && foundProduct.images.length > 0) {
            setSelectedImage(foundProduct.images[0]);
        }

        // Countdown logic modified to restart every 59 minutes
        const initializeCountdown = () => {
            // Set the countdown to 59 minutes (59 * 60 * 1000 ms)
            const newTargetTime = new Date().getTime() + 59 * 60 * 1000;
            localStorage.setItem('targetTime', newTargetTime);
            return newTargetTime;
        };

        // Get the stored target time or initialize it to 59 minutes
        let targetTime = parseInt(localStorage.getItem('targetTime'), 10) || initializeCountdown();

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const difference = targetTime - now;

            if (difference <= 0) {
                // Reset countdown when it reaches zero
                targetTime = initializeCountdown();
            } else {
                // Calculate time left
                const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((difference % (1000 * 60)) / 1000);
                setTimeLeft({ hours, minutes, seconds });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [productId]);

    const scrollToReviews = () => {
        const reviewsSection = document.querySelector('.reviews');
        if (reviewsSection) {
            reviewsSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Zoom sur l'image des avis
    const handleImageClick = () => {
        setIsZoomed(!isZoomed); // Toggle zoom
    };

    // Gérer la sélection du prix en fonction du nombre d'articles
    const handlePriceChange = (e) => {
        const selectedOption = e.target.value;
        setFormData({ ...formData, quantity: selectedOption });
        if (selectedOption === 'one') {
            setPrice(product.price);
        } else if (selectedOption === 'two') {
            setPrice(product.twoPrice);
        }
    };

    const handlePackSelect = (packId) => {
        setSelectedPack(packId);
        const pack = packs.find(p => p.id === packId);
        if (pack) setPrice(pack.price);
    };

    const handleScrollToFormAndSubmit = (e) => {
        // Appel de la fonction de défilement
        scrollToError();

        // Soumettre le formulaire avec un délai pour le défilement
        setTimeout(() => {
            handleFormSubmit(e);
        }, 300); // Ajustez le délai si nécessaire
    };

    const isAirpodsProduct = product && airpodsProductNames.some(name => product.name && product.name.toLowerCase().includes(name.toLowerCase()));

    if (!product || !product.name) {
        return (
            <div className="not-found-container">
                <h2 className="not-found-message">المنتج غير موجود.</h2>
                <p className="not-found-description">يبدو أن المنتج الذي تبحث عنه غير متوفر.</p>
                <button className="back-to-menu-button" onClick={() => window.location.href = '/'}>
                    العودة إلى القائمة
                </button>
            </div>
        );
    }

    return (
        <div className="product-page">
            <div className="sidebar">
                <img src={selectedImage || ''} alt="منتج" className="main-image" />
                <div className="image-thumbnails">
                    {product.images && product.images.map((image, index) => (
                        <img
                            key={index}
                            src={image}
                            alt={`Thumbnail ${index}`}
                            className={`thumbnail ${selectedImage === image ? 'active' : ''}`}
                            onClick={() => setSelectedImage(image)}
                        />
                    ))}
                </div>
            </div>

            <div className="product-content">
                <p className="promotion-text">PROMOTION -57%</p>

                <h1 style={{ fontSize: '20px' }}>{product.name} {product.name.includes("Spotify premium") && (
                    <img src={`${process.env.PUBLIC_URL}/spotify.png`} alt="شعار Spotify" className="spotify-logo" />
                )}</h1>
                <div id='firstForm' ref={formRef}></div>

                <h1 style={{ fontSize: '16px' }}>{product.bonus1} </h1>
                <h1 style={{ fontSize: '16px' }}>{product.bonus2} </h1>
                <h1 style={{ fontSize: '16px' }}>{product.bonus1_ar} </h1>
                <h1 style={{ fontSize: '16px' }}>{product.bonus2_ar} </h1>
                <h1 style={{ fontSize: '16px' }}>{product.bonus3_ar} </h1>
                <h1 style={{ fontSize: '16px' }}>{product.bonus4_ar} </h1>

                {isAirpodsProduct && (
                    <div className="packs-selection">
                        <h3 className="choosepack-button" onClick={handleScrollToFormAndSubmit}>اختر الباك المناسب لك ▼</h3>
                        <div className="packs-list">
                            {packs.map(pack => (
                                <div
                                    key={pack.id}
                                    className={`pack-card ${selectedPack === pack.id ? 'selected' : ''}`}
                                    onClick={() => handlePackSelect(pack.id)}
                                    style={{
                                        border: selectedPack === pack.id ? '2px solid #28a745' : '1px solid #ccc',
                                        borderRadius: '10px',
                                        padding: '15px',
                                        marginBottom: '10px',
                                        cursor: 'pointer',
                                        background: selectedPack === pack.id ? '#f0fff0' : '#fff'
                                    }}
                                >
                                    <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{pack.name} – {pack.price}Dh</div>
                                    <ul style={{ margin: '10px 0 0 0', padding: 0, listStyle: 'none' }}>
                                        {pack.details.map((d, i) => (
                                            <li key={i}>{d}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div id="orderForm" className="order-form" ref={formRef}>
                    <p className="price">
                        <span className="new-price">د.م{price} </span>
                        <span className="old-price">د.م{product.oldPrice} </span>
                    </p>

                    <form onSubmit={handleFormSubmit}>
                        <div>
                            <input
                                type="text"
                                name="name"
                                placeholder="الاسم "
                                value={formData.name}
                                onChange={handleChange}
                                ref={nameRef}
                            />
                            {errors.name && <p className="error-message">{errors.name}</p>}
                        </div>

                        <div>
                            <input
                                type="text"
                                name="phone"
                                placeholder="06XXXXXXXX رقم الهاتف"
                                value={formData.phone}
                                onChange={handleChange}
                                ref={phoneRef}
                            />
                            {errors.phone && <p className="error-message">{errors.phone}</p>}
                        </div>

                        <div>
                            <input
                                type="text"
                                name="address"
                                placeholder="العنوان"
                                value={formData.address}
                                onChange={handleChange}
                                ref={addressRef}
                            />
                            {errors.address && <p className="error-message">{errors.address}</p>}
                        </div>

                        <div>
                            <input
                                type="text"
                                name="city"
                                placeholder="المدينة"
                                value={formData.city}
                                onChange={handleChange}
                                ref={cityRef}
                            />
                            {errors.city && <p className="error-message">{errors.city}</p>}
                        </div>

                        {product.color === 1 && (
                            <><h3>اختر اللون </h3>

                                <div className="color-selection">

                                    {airpodsMaxColors.map((color) => (
                                        <div
                                            key={color.name}
                                            className={`color-option ${selectedColor === color.name ? 'selected' : ''}`}
                                            style={{ backgroundColor: color.hex }} // Set background color
                                            onClick={() => setSelectedColor(selectedColor === color.name ? '' : color.name)} // Toggle selection
                                        ></div>
                                    ))}
                                </div>

                            </>
                        )}

                        {selectedColor && (
                            <div className="selected-color-display">
                                <div
                                    className="selected-color-square"
                                    style={{
                                        backgroundColor: airpodsMaxColors.find(color => color.name === selectedColor)?.hex
                                    }}
                                ></div>
                                <p > اللون المحدد:</p>

                            </div>
                        )}
                        {/* <div className="radio-group">
                            <input
                                type="radio"
                                id="one-piece"
                                name="quantity"
                                value="one"
                                defaultChecked
                                onChange={handlePriceChange}
                            />
                            <p> واحدة ب {product.price} درهم </p><span className="promotion-small">-50%</span>
                        </div>
                        <div className="radio-group">
                            <input
                                type="radio"
                                id="two-pieces"
                                name="quantity"
                                value="two"
                                onChange={handlePriceChange}
                            />
                            <p>العرض الثاني 2 ب {product.twoPrice} درهم </p><span className="promotion-small">-57%</span>
                        </div>*/}

                        <button type="submit" className="order-button">➤  اشتري الآن وادفع لاحقا</button>
                    </form>
                </div>
                <div className="fixed-bottom-order">
                    <button type="button" className="fixed-order-button" onClick={handleScrollToFormAndSubmit}>➤   اشتري الآن وادفع لاحقا</button>
                </div>
                <div className="countdown">
                    <h3>سينتهي العرض في :</h3>
                    <div className="countdown-timer">
                        <span>00 </span>
                        <span>{String(timeLeft.hours).padStart(2, '0')} :</span>
                        <span>{String(timeLeft.minutes).padStart(2, '0')} :</span>
                        <span>{String(timeLeft.seconds).padStart(2, '0')}:</span>
                    </div>
                    <div className="countdown-days">
                        <span> ثواني</span>
                        <span> دقائق</span>
                        <span> ساعات</span>
                        <span> أيام</span>

                    </div>
                </div>
                <img src={product.bonusImage} alt={product.name} className="bonus-image" />
                <h3> ⚠️  تخفيض مؤقت ⚠️                </h3>
                <ul style={{ listStyleType: 'none' }}>
                    {product.description && product.description.map((description, index) => (
                        <li key={index}>{description}</li>
                    ))}
                </ul>
                <h1 style={{ fontSize: '16px', fontWeight: 'bold' }}>   {product.infos}</h1>




                {/* Formulaire d'achat */}


                {/* Compte à rebours */}


                {/* Caractéristiques du produit */}
                <div className="features">
                    <h3>الميزات الرئيسية</h3>
                    <ul>
                        {product.features && product.features.map((feature, index) => (
                            <li key={index}>{feature}</li>
                        ))}
                    </ul>
                </div>

                {/* Images du produit */}
                <div className="product-images-section mobile-only">
                    <div className="product-images-container">
                        {product.images && product.images.map((image, index) => (
                            <img
                                key={index}
                                src={image}
                                className="product-image"
                                alt={`Product Image ${index + 1}`} // Ajoutez un alt pour l'accessibilité
                            />
                        ))}
                    </div>
                </div>

                {/* Avis clients (mobile only) */}
                {/*<div className="reviews mobile-only">
                    <h3>آراء العملاء</h3>
                    <div className="reviews-container">
                        {reviews.map((review, index) => (
                            <div key={index} className="review">
                                <strong>{review.name} :</strong>
                                <p>{review.comment}</p>
                                <img
                                    src={review.image}
                                    alt={`Avis de ${review.name}`}
                                    className="review-image"
                                    onClick={handleImageClick}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="arrows-decoration">
                        <span className="left-arrow-decoration">&lt;</span>
                        <span className="right-arrow-decoration">&gt;</span>
                    </div>
                </div>*/}
            </div>
        </div>
    );
};

export default ProductPage;