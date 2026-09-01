from app.services.compliance_service import check_compliance


def test_compliance_clean_text():
    result = check_compliance("今天分享一个护肤小技巧")
    assert result.level == "low"


def test_compliance_sensitive_word():
    result = check_compliance("这是最好的美白产品，用了就能根治斑点")
    assert result.level == "high"
    assert any("医疗功效" in issue for issue in result.issues)


def test_compliance_external_link():
    result = check_compliance("加微信了解更多")
    assert result.level == "medium"
    assert any("外部导流" in issue for issue in result.issues)
