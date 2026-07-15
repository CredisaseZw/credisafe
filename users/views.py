from django.shortcuts import render

# Create your views here.
from django.views.decorators.http import require_GET
@require_GET
def fast_individual_search(request):

    # ==========================================
    # AUTHENTICATION
    # ==========================================
    ALLOWED_CLIENTS = {
        "api.credi-safe.com": "11A2CKD2Q0AVDe94UROko",
        "assetsafe.com": "IJl1lIASX3AQAZJbZPT",
    }

    username = request.headers.get("Username")
    token = request.headers.get("Token")

    if not username or not token:
        return JsonResponse(
            {"error": "Missing Username or Token"},
            status=401
        )

    if username not in ALLOWED_CLIENTS:
        return JsonResponse(
            {"error": "Domain not allowed"},
            status=403
        )

    if token != ALLOWED_CLIENTS[username]:
        return JsonResponse(
            {"error": "Invalid token"},
            status=401
        )

    # ==========================================
    # INPUT
    # ==========================================

    national_id = request.GET.get("national_id")

    if not national_id:
        return JsonResponse(
            {"error": "national_id is required"},
            status=400
        )

    # ==========================================
    # FAST INDIVIDUAL LOOKUP
    # ==========================================

    individual = (
        Individual.objects
        .filter(
            national_id=national_id,
            is_deleted=False
        )
        .values(
            "fins_number",
            "national_id",
            "firstname",
            "surname",
            "dob",
            "gender",
            "mobile",
            "address",
            "risk_class",
        )
        .first()
    )

    if not individual:
        return JsonResponse(
            {
                "found": False,
                "message": "Individual not found"
            },
            status=404
        )

    fins_number = individual["fins_number"]

    # ==========================================
    # FAST CLAIMS LOOKUP
    # ==========================================

    claims = list(
        Claim.objects
        .filter(
            individual_debtor_fins_id=fins_number
        )
        .values(
            "claim_number",
            "account_number",
            "amount",
            "overdue_balance",
            "date_of_claim",
            "currency_type",
            "is_closed",
            "is_absconder",
            "company_creditor_fins__registration_name",
        )[:20]   # LIMIT FOR SPEED
    )

    # ==========================================
    # FAST COURT RECORDS LOOKUP
    # ==========================================

    court_records = list(
        Court.objects
        .filter(
            defendent_individual_id=fins_number
        )
        .values(
            "case_number",
            "court_name",
            "amount",
            "currency_type",
            "judgement_date",
            "is_closed",
            "plaintf_name",
        )[:20]   # LIMIT FOR SPEED
    )

    # ==========================================
    # RESPONSE
    # ==========================================

    return JsonResponse({
        "found": True,

        "individual": individual,

        "summary": {
            "claims_count": len(claims),
            "court_cases_count": len(court_records),
        },

        "claims": claims,

        "court_records": court_records,
    })

@require_GET
def fast_company_search(request):

    # ==========================================
    # AUTHENTICATION
    # ==========================================
    ALLOWED_CLIENTS = {
        "api.credi-safe.com": "11A2CKD2Q0AVDe94UROko",
        "assetsafe.com": "IJl1lIASX3AQAZJbZPT",
    }
    username = request.headers.get("Username")
    token = request.headers.get("Token")

    if not username or not token:
        return JsonResponse(
            {"error": "Missing Username or Token"},
            status=401
        )

    if username not in ALLOWED_CLIENTS:
        return JsonResponse(
            {"error": "Domain not allowed"},
            status=403
        )

    if token != ALLOWED_CLIENTS[username]:
        return JsonResponse(
            {"error": "Invalid token"},
            status=401
        )

    # ==========================================
    # INPUT
    # ==========================================

    search = request.GET.get("search")

    if not search:
        return JsonResponse(
            {"error": "search is required"},
            status=400
        )

    # ==========================================
    # FAST COMPANY LOOKUP
    # ==========================================
    # EXACT MATCH ONLY FOR MAXIMUM SPEED
    # ==========================================

    company = (
        Company.objects
        .filter(
            Q(registration_number=search) |
            Q(registration_name=search)
        )
        .values(
            "fins_number",
            "registration_number",
            "registration_name",
            "trading_name",
            "mobile_phone",
            "email",
            "current_address",
            "industry",
            "risk_class",
            "legal_status",
            "trading_status",
        )
        .first()
    )

    if not company:
        return JsonResponse(
            {
                "found": False,
                "message": "Company not found"
            },
            status=404
        )

    fins_number = company["fins_number"]

    # ==========================================
    # FAST CLAIMS LOOKUP
    # ==========================================

    claims = list(
        Claim.objects
        .filter(
            company_debtor_fins_id=fins_number
        )
        .values(
            "claim_number",
            "account_number",
            "amount",
            "overdue_balance",
            "currency_type",
            "date_of_claim",
            "is_closed",
            "is_absconder",
            "company_creditor_fins__registration_name",
        )[:20]
    )

    # ==========================================
    # FAST COURT RECORDS LOOKUP
    # ==========================================

    court_records = list(
        Court.objects
        .filter(
            defendent_company_id=fins_number
        )
        .values(
            "case_number",
            "court_name",
            "amount",
            "currency_type",
            "judgement_date",
            "is_closed",
            "plaintf_name",
        )[:20]
    )

    # ==========================================
    # RESPONSE
    # ==========================================

    return JsonResponse({
        "found": True,

        "company": company,

        "summary": {
            "claims_count": len(claims),
            "court_cases_count": len(court_records),
        },

        "claims": claims,

        "court_records": court_records,
    })
