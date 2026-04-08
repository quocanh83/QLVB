from difflib import SequenceMatcher

def calculate_similarity(s1, s2):
    if not s1 or not s2: return 0
    return SequenceMatcher(None, str(s1).lower(), str(s2).lower()).ratio()

def automap_nodes(base_nodes, draft_nodes, threshold=0.6):
    """
    Tự động tìm cặp ánh xạ dựa trên nhãn (node_label) và nội dung.
    logic:
    1. Ưu tiên khớp tuyệt đối Label.
    2. Nếu không có, tìm Khớp Similarity Label > 0.8.
    3. Nếu không có, tìm Khớp Similarity Nội dung > 0.7.
    """
    mapping = {}
    draft_pool = list(draft_nodes)
    
    for b_node in base_nodes:
        best_match = None
        highest_score = 0
        match_type = None # label_exact, label_fuzzy, content_fuzzy
        
        for d_node in draft_pool:
            # 1. Khớp tuyệt đối Label
            if b_node.node_label.strip().lower() == d_node.node_label.strip().lower():
                best_match = d_node
                highest_score = 1.0
                match_type = 'label_exact'
                break
            
            # 2. Khớp fuzzy Label
            l_score = calculate_similarity(b_node.node_label, d_node.node_label)
            if l_score > 0.8 and l_score > highest_score:
                best_match = d_node
                highest_score = l_score
                match_type = 'label_fuzzy'
            
            # 3. Khớp fuzzy Content (chỉ khi label không quá khác biệt hoặc node là Phụ lục)
            if not best_match or match_type == 'label_fuzzy':
                c_score = calculate_similarity(b_node.content[:200], d_node.content[:200])
                if c_score > 0.7 and c_score > highest_score:
                    best_match = d_node
                    highest_score = c_score
                    match_type = 'content_fuzzy'
        
        if best_match and highest_score >= threshold:
            mapping[b_node.id] = best_match.id
            # Tạm thời không xóa khỏi pool để linh hoạt, nhưng controller có thể xử lý mapping 1-1
            
    return mapping
