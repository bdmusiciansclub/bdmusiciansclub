const BD_DATA = {
  "Dhaka": {
    "Dhaka": ["Adabor","Badda","Bangshal","Cantonment","Chawkbazar","Demra","Dhanmondi","Dohar","Gulshan","Hazaribagh","Jatrabari","Kadamtali","Kafrul","Kalabagan","Keraniganj","Khilgaon","Khilkhet","Kotwali","Lalbagh","Mirpur","Mohammadpur","Motijheel","Nawabganj","Newmarket","Pallabi","Paltan","Ramna","Rayer Bazar","Sabujbagh","Shahbagh","Sher-e-Bangla Nagar","Shyampur","Sutrapur","Tejgaon","Turag","Uttara","Uttarkhan","Vatara","Wari"],
    "Gazipur": ["Gazipur Sadar","Kaliakair","Kaliganj","Kapasia","Sreepur","Tongi"],
    "Manikganj": ["Daulatpur","Ghior","Harirampur","Manikganj Sadar","Saturia","Shivalaya","Singair"],
    "Munshiganj": ["Gazaria","Lohajang","Munshiganj Sadar","Sirajdikhan","Sreenagar","Tongibari"],
    "Narayanganj": ["Araihazar","Bandar","Narayanganj Sadar","Rupganj","Sonargaon"],
    "Narsingdi": ["Belabo","Monohardi","Narsingdi Sadar","Palash","Raipura","Shibpur"],
    "Rajbari": ["Baliakandi","Goalandaghat","Kalukhali","Pangsha","Rajbari Sadar"],
    "Shariatpur": ["Bhedarganj","Damudya","Gosairhat","Naria","Shariatpur Sadar","Zanjira"],
    "Tangail": ["Basail","Bhuapur","Delduar","Dhanbari","Ghatail","Gopalpur","Kalihati","Madhupur","Mirzapur","Nagarpur","Sakhipur","Tangail Sadar"]
  },
  "Chittagong": {
    "Chittagong": ["Anwara","Banshkhali","Boalkhali","Chandanaish","Fatikchhari","Hathazari","Karnaphuli","Lohagara","Mirsharai","Patiya","Rangunia","Raozan","Sandwip","Satkania","Sitakunda","Chittagong City"],
    "Cox's Bazar": ["Chakaria","Cox's Bazar Sadar","Kutubdia","Maheshkhali","Pekua","Ramu","Teknaf","Ukhia"],
    "Bandarban": ["Ali Kadam","Bandarban Sadar","Lama","Naikhongchhari","Rowangchhari","Ruma","Thanchi"],
    "Brahmanbaria": ["Akhaura","Ashuganj","Bancharampur","Brahmanbaria Sadar","Kasba","Nabinagar","Nasirnagar","Sarail"],
    "Chandpur": ["Chandpur Sadar","Faridganj","Haimchar","Haziganj","Kachua","Matlab Dakshin","Matlab Uttar","Shahrasti"],
    "Comilla": ["Barura","Brahmanpara","Burichang","Chandina","Chauddagram","Comilla Sadar","Daudkandi","Debidwar","Homna","Laksam","Meghna","Monohorgonj","Muradnagar","Nangalkot","Titas"],
    "Feni": ["Chhagalnaiya","Daganbhuiyan","Feni Sadar","Parshuram","Sonagazi"],
    "Khagrachhari": ["Dighinala","Khagrachhari Sadar","Lakshmichhari","Mahalchhari","Manikchhari","Matiranga","Panchhari","Ramgarh"],
    "Lakshmipur": ["Kamalnagar","Lakshmipur Sadar","Ramganj","Ramgati","Roypur"],
    "Noakhali": ["Begumganj","Chatkhil","Companiganj","Hatiya","Kabirhat","Noakhali Sadar","Senbagh","Sonaimuri","Subarnachar"],
    "Rangamati": ["Baghaichhari","Barkal","Belaichhari","Juraichhari","Kaptai","Kawkhali","Langadu","Naniarchar","Rajasthali","Rangamati Sadar"]
  },
  "Rajshahi": {
    "Rajshahi": ["Bagha","Bagmara","Charghat","Durgapur","Godagari","Mohanpur","Paba","Puthia","Rajshahi Sadar","Tanore"],
    "Bogura": ["Adamdighi","Bogura Sadar","Dhunat","Dupchanchia","Gabtali","Kahaloo","Nandigram","Sariakandi","Shajahanpur","Sherpur","Shibganj","Sonatola"],
    "Chapai Nawabganj": ["Bholahat","Chapai Nawabganj Sadar","Gomastapur","Nachole","Shibganj"],
    "Joypurhat": ["Akkelpur","Joypurhat Sadar","Kalai","Khetlal","Panchbibi"],
    "Naogaon": ["Atrai","Badalgachhi","Dhamoirhat","Mahadebpur","Manda","Naogaon Sadar","Niamatpur","Patnitala","Porsha","Raninagar","Sapahar"],
    "Natore": ["Bagatipara","Baraigram","Gurudaspur","Lalpur","Natore Sadar","Singra"],
    "Pabna": ["Atgharia","Bera","Bhangura","Chatmohar","Faridpur","Ishwardi","Pabna Sadar","Santhia","Sujanagar"],
    "Sirajganj": ["Belkuchi","Chauhali","Kamarkhanda","Kazipur","Raiganj","Shahjadpur","Sirajganj Sadar","Tarash","Ullahpara"]
  },
  "Khulna": {
    "Khulna": ["Batiaghata","Dacope","Daulatpur","Dighalia","Dumuria","Khalishpur","Khan Jahan Ali","Khulna Sadar","Koyra","Paikgachha","Phultala","Rupsa","Sonadanga","Terokhada"],
    "Bagerhat": ["Bagerhat Sadar","Chitalmari","Fakirhat","Kachua","Mollahat","Mongla","Morrelganj","Rampal","Sharankhola"],
    "Chuadanga": ["Alamdanga","Chuadanga Sadar","Damurhuda","Jibannagar"],
    "Jessore": ["Abhaynagar","Bagherpara","Chaugachha","Jessore Sadar","Jhikargachha","Keshabpur","Manirampur","Sharsha"],
    "Jhenaidah": ["Harinakunda","Jhenaidah Sadar","Kaliganj","Kotchandpur","Maheshpur","Shailkupa"],
    "Kushtia": ["Bheramara","Daulatpur","Khoksa","Kumarkhali","Kushtia Sadar","Mirpur"],
    "Magura": ["Magura Sadar","Mohammadpur","Shalikha","Sreepur"],
    "Meherpur": ["Gangni","Meherpur Sadar","Mujibnagar"],
    "Narail": ["Kalia","Lohagara","Narail Sadar"],
    "Satkhira": ["Assasuni","Debhata","Kalaroa","Kaliganj","Satkhira Sadar","Shyamnagar","Tala"]
  },
  "Barishal": {
    "Barishal": ["Agailjhara","Babuganj","Backerganj","Banaripara","Barisal Sadar","Gaurnadi","Hizla","Mehendiganj","Muladi","Wazirpur"],
    "Bhola": ["Bhola Sadar","Borhanuddin","Charfasson","Daulatkhan","Lalmohan","Manpura","Tazumuddin"],
    "Jhalokati": ["Jhalokati Sadar","Kanthalia","Nalchity","Rajapur"],
    "Patuakhali": ["Bauphal","Dashmina","Dumki","Galachipa","Kalapara","Mirzaganj","Patuakhali Sadar","Rangabali"],
    "Pirojpur": ["Bhandaria","Kawkhali","Mathbaria","Nazirpur","Nesarabad","Pirojpur Sadar","Zianagar"],
    "Barguna": ["Amtali","Bamna","Barguna Sadar","Betagi","Patharghata","Taltali"]
  },
  "Sylhet": {
    "Sylhet": ["Balaganj","Beanibazar","Bishwanath","Companigonj","Dakshin Surma","Fenchuganj","Golapganj","Gowainghat","Jaintiapur","Kanaighat","Osmani Nagar","Sylhet Sadar","Zakiganj"],
    "Habiganj": ["Ajmiriganj","Bahubal","Baniachong","Chunarughat","Habiganj Sadar","Lakhai","Madhabpur","Nabiganj"],
    "Moulvibazar": ["Barlekha","Juri","Kamalganj","Kulaura","Moulvibazar Sadar","Rajnagar","Sreemangal"],
    "Sunamganj": ["Bishwamvarpur","Chhatak","Derai","Dharampasha","Dowarabazar","Jagannathpur","Jamalganj","Shalla","Sunamganj Sadar","Tahirpur"]
  },
  "Mymensingh": {
    "Mymensingh": ["Bhaluka","Dhobaura","Fulbaria","Gaffargaon","Gauripur","Haluaghat","Ishwarganj","Mymensingh Sadar","Muktagachha","Nandail","Phulpur","Trishal"],
    "Jamalpur": ["Bakshiganj","Dewanganj","Islampur","Jamalpur Sadar","Madarganj","Melandaha","Sarishabari"],
    "Netrokona": ["Atpara","Barhatta","Durgapur","Kalmakanda","Kendua","Khaliajuri","Madan","Mohanganj","Netrokona Sadar","Purbadhala"],
    "Sherpur": ["Jhenaigati","Nakla","Nalitabari","Sherpur Sadar","Sreebardi"]
  },
  "Rangpur": {
    "Rangpur": ["Badarganj","Gangachara","Kaunia","Mithapukur","Pirgachha","Pirganj","Rangpur Sadar","Taraganj"],
    "Dinajpur": ["Birampur","Birganj","Biral","Bochaganj","Chirirbandar","Dinajpur Sadar","Fulbari","Ghoraghat","Hakimpur","Kaharole","Khansama","Nawabganj","Parbatipur"],
    "Gaibandha": ["Fulchhari","Gaibandha Sadar","Gobindaganj","Palashbari","Sadullapur","Saghata","Sundarganj"],
    "Kurigram": ["Bhurungamari","Char Rajibpur","Chilmari","Kurigram Sadar","Nageshwari","Phulbari","Rajarhat","Raomari","Ulipur"],
    "Lalmonirhat": ["Aditmari","Hatibandha","Kaliganj","Lalmonirhat Sadar","Patgram"],
    "Nilphamari": ["Dimla","Domar","Jaldhaka","Kishoreganj","Nilphamari Sadar","Saidpur"],
    "Panchagarh": ["Atwari","Boda","Debiganj","Panchagarh Sadar","Tetulia"],
    "Thakurgaon": ["Baliadangi","Haripur","Pirganj","Ranisankail","Thakurgaon Sadar"]
  }
};

function initGeoDropdowns(divSel, distSel, thanaSel) {
  const divEl = document.getElementById(divSel);
  const distEl = document.getElementById(distSel);
  const thanaEl = document.getElementById(thanaSel);
  if (!divEl) return;

  Object.keys(BD_DATA).forEach(div => {
    const opt = document.createElement('option');
    opt.value = div; opt.textContent = div;
    divEl.appendChild(opt);
  });

  divEl.addEventListener('change', () => {
    distEl.innerHTML = '<option value="">-- Select District --</option>';
    thanaEl.innerHTML = '<option value="">-- Select Thana/Upazila --</option>';
    const divData = BD_DATA[divEl.value];
    if (!divData) return;
    Object.keys(divData).forEach(dist => {
      const opt = document.createElement('option');
      opt.value = dist; opt.textContent = dist;
      distEl.appendChild(opt);
    });
    distEl.disabled = false;
  });

  distEl.addEventListener('change', () => {
    thanaEl.innerHTML = '<option value="">-- Select Thana/Upazila --</option>';
    const divData = BD_DATA[divEl.value];
    if (!divData || !divData[distEl.value]) return;
    divData[distEl.value].forEach(thana => {
      const opt = document.createElement('option');
      opt.value = thana; opt.textContent = thana;
      thanaEl.appendChild(opt);
    });
    thanaEl.disabled = false;
  });
}
